import OpenAI from "openai";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { createHttpError } from "../utils/httpError.js";
import { retrieveTopKChunks } from "./rag/retrieval.service.js";
import { classifyIntent } from "./chat/intentRouter.js";
import { buildBookingContext } from "./chat/bookingTool.js";
import { buildPrevisitContext } from "./chat/previsitTool.js";

const DANGER_SIGNALS = [
  "khó thở",
  "đau ngực",
  "ngất",
  "khong tho duoc",
  "chest pain",
  "shortness of breath",
  "faint",
  "unconscious",
];

const GREETING_PATTERNS = [
  /^\s*(xin\s+chao|chao|hello|hi|alo|hey)(\s+.*)?$/i,
  /^\s*(chao\s+bac\s+si|chao\s+phong\s+kham)(\s+.*)?$/i,
];

const STOP_WORDS = new Set([
  "la",
  "gi",
  "co",
  "khong",
  "toi",
  "minh",
  "ban",
  "can",
  "bi",
  "nen",
  "lam",
  "sao",
  "hoi",
  "ve",
  "va",
  "hoac",
  "cho",
  "cua",
  "trong",
  "khi",
  "neu",
  "thi",
  "nhu",
  "the",
  "nao",
]);

// Ollama dùng OpenAI-compatible API, không cần API key
const ollamaClient = new OpenAI({
  baseURL: `${env.ollamaBaseUrl}/v1`,
  apiKey: "ollama",
});

// Các hàm rule-based này chỉ giữ lại để tương thích, logic chính đã chuyển sang intentRouter.js
function hasDangerSignal(text) {
  const normalized = String(text || "").toLowerCase();
  return DANGER_SIGNALS.some((keyword) => normalized.includes(keyword));
}

function stripPii(value) {
  return String(value || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(0|\+84)\d{8,10}\b/g, "[redacted-phone]")
    .replace(/\b\d{10,16}\b/g, "[redacted-number]");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function titleCoverage(query, title) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return 0;

  const titleTokens = new Set(tokenize(title));
  const matched = queryTokens.filter((token) => titleTokens.has(token)).length;
  return matched / queryTokens.length;
}

function chunkIndex(item) {
  return Number(item?.chunkIndex ?? item?.meta?.chunkIndex ?? 0);
}

function dedupeRetrieved(retrieved) {
  const byKey = new Map();

  for (const item of retrieved || []) {
    const key = item.id || `${item.documentId || item.title}-${item.chunkIndex}-${item.content}`;
    const existing = byKey.get(key);
    if (!existing || item.score > existing.score) {
      byKey.set(key, item);
    }
  }

  return [...byKey.values()];
}

function focusRetrievedChunks(userText, retrieved) {
  const unique = dedupeRetrieved(retrieved);
  if (unique.length <= 1) return unique;

  const scored = unique.map((item) => ({
    item,
    coverage: titleCoverage(userText, item.title),
  }));
  const bestCoverage = Math.max(...scored.map((entry) => entry.coverage));

  if (bestCoverage >= 0.6) {
    const titleGroup = scored
      .filter((entry) => entry.coverage === bestCoverage)
      .sort((a, b) => {
        const scoreDiff = b.item.score - a.item.score;
        if (a.item.documentId === b.item.documentId && Math.abs(scoreDiff) < 0.5) {
          return chunkIndex(a.item) - chunkIndex(b.item);
        }
        return scoreDiff;
      });

    return [titleGroup[0].item];
  }

  const [primary, secondary] = unique;
  if (!secondary || primary.score >= secondary.score * 1.35 || primary.score - secondary.score >= 2) {
    return [primary];
  }

  return unique.slice(0, 2);
}

function shouldShowCitations(reply) {
  return reply?.confidence === "low" || Boolean(reply?.fallbackFrom);
}

function buildAssistantReplyTemplate({ retrieved }) {
  const primary = retrieved[0];
  const primaryText = primary?.content?.slice(0, 600).trim();

  if (primaryText && primaryText.length <= 160) {
    return {
      answer: [
        `Nếu bạn đang hỏi về ${primary.title}, bạn có thể tham khảo hướng này: ${primaryText}.`,
        "",
        "Bạn có thể đặt lịch để bác sĩ kiểm tra trực tiếp và tư vấn kỹ hơn cho tình trạng của mình.",
      ].join("\n"),
      citations: retrieved.map((item) => item.citation),
      confidence: "medium",
      provider: "template",
    };
  }

  const groundedFacts = retrieved
    .slice(0, 3)
    .map((item) => item.content.slice(0, 600).trim())
    .join("\n\n");

  const answer = [
    "Mình thấy có một số thông tin phù hợp với câu hỏi của bạn:",
    "",
    groundedFacts,
    "",
    "---",
    "Lưu ý: thông tin này chỉ để tham khảo, không thay thế chẩn đoán của bác sĩ.",
    "",
    "Bạn có thể đặt lịch khám để bác sĩ đánh giá trực tiếp và tư vấn hướng xử lý phù hợp.",
  ].join("\n");

  return {
    answer,
    citations: retrieved.map((item) => item.citation),
    confidence: "medium",
    provider: "template",
  };
}

async function buildAssistantReplyOllama({ userText, retrieved, extraContext, systemHint, history = [] }) {
  const context = extraContext
    ? extraContext
    : retrieved
        .slice(0, 5)
        .map(
          (item, idx) =>
            `[Nguon ${idx + 1}] Title: ${item.title}; Chunk: ${item.chunkIndex ?? "-"}\n${item.content}`
        )
        .join("\n\n");

  const baseSystem = systemHint ||
    "Ban la tro ly tien kham cho phong kham. Chi duoc tra loi dua tren CONTEXT da cung cap, khong duoc bia them va khong chan doan benh. Tra loi nhu mot nhan vien tu van lich su, tu nhien, co chu ngu 'ban' va cau van gan voi nguoi dung. Khong bat dau bang 'Theo tai lieu noi bo' tru khi that su can. Neu CONTEXT co cau tra loi ngan hoac solution ngan, hay bien no thanh cau tu van tu nhien, vi du: 'Neu ban dang dau mat, ban co the tham khao ...'. Khong duoc noi 'khong co du lieu' khi CONTEXT khong rong. Neu CONTEXT that su khong lien quan thi noi ro khong chac chan va khuyen lien he phong kham. Neu thay dau hieu nguy hiem (kho tho, dau nguc, ngat), uu tien khuyen di cap cuu ngay.";

  const userPrompt = [
    `Cau hoi nguoi dung: ${userText}`,
    "",
    "CONTEXT:",
    context,
    "",
    "Hay tra loi bang tieng Viet than thien, ngan gon. Neu CONTEXT dua ra solution truc tiep, hay dien dat thanh loi khuyen tu nhien cho dung cau hoi cua nguoi dung. Vi du cau hoi la 'dau mat' va CONTEXT la 'dung goi ortk aaa' thi tra loi kieu: 'Neu ban dang dau mat, ban co the tham khao goi kham Ortho-K aaa. Ban nen dat lich de bac si kiem tra truc tiep xem co phu hop khong.' Khong chi copy may moc CONTEXT.",
  ].join("\n");

  const completion = await ollamaClient.chat.completions.create({
    model: env.ollamaChatModel,
    temperature: 0.35,
    messages: [
      { role: "system", content: baseSystem },
      // Inject previous turns so the LLM has conversation context
      ...history.map((m) => ({
        role: m.role === "USER" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: userPrompt },
    ],
  });

  const answer = completion.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error("OLLAMA_EMPTY_RESPONSE");
  }

  return {
    answer,
    citations: retrieved.map((item) => item.citation),
    confidence: "high",
    provider: "ollama",
  };
}

async function buildAssistantReply({ userText, retrieved, history = [] }) {
  const intent = classifyIntent(userText);
  const focusedRetrieved = focusRetrievedChunks(userText, retrieved);

  // ─── Rule-based intents (không cần LLM) ──────────────────────────────────
  if (intent === "greeting") {
    return {
      answer:
        "Chào bạn! Mình là trợ lý của phòng khám ClinicAI 👋\n\n" +
        "Mình có thể giúp bạn:\n" +
        "- **Giải đáp FAQ** về sức khỏe và dịch vụ phòng khám\n" +
        "- **Hướng dẫn đặt lịch khám** và xem slot trống\n" +
        "- **Hướng dẫn điền phiếu tiền khám** trước buổi hẹn\n\n" +
        "Bạn cần hỗ trợ gì hôm nay?",
      citations: [],
      confidence: "low",
      provider: "rule",
      intent,
    };
  }

  if (intent === "emergency") {
    return {
      answer:
        "⚠️ **Dấu hiệu khẩn cấp!**\n\nTôi phát hiện mô tả có dấu hiệu nguy hiểm (khó thở / đau ngực / ngất / co giật).\n\n" +
        "**Vui lòng gọi ngay cấp cứu: 115** hoặc đến cơ sở y tế gần nhất ngay lập tức. Không tự điều trị tại nhà.",
      citations: [],
      confidence: "critical",
      provider: "rule",
      intent,
    };
  }

  // ─── Tool-augmented intents ───────────────────────────────────────────────
  if (intent === "booking") {
    const bookingContext = await buildBookingContext();

    if (env.ragGenerationProvider === "ollama") {
      try {
        return await buildAssistantReplyOllama({
          userText,
          retrieved: [],
          extraContext: bookingContext,
          systemHint: "Bạn là trợ lý đặt lịch của phòng khám. Dựa trên danh sách bác sĩ và slot trống bên dưới, hướng dẫn người dùng đặt lịch cụ thể.",
          history,
        });
      } catch (_) {
        // fallback to template
      }
    }

    return {
      answer:
        "Dưới đây là thông tin đặt lịch từ hệ thống:\n\n" +
        bookingContext +
        "\n\n💡 Để đặt lịch, bạn vào trang **Đặt lịch khám** trên menu và làm theo hướng dẫn.",
      citations: [],
      confidence: "high",
      provider: "booking_tool",
      intent,
    };
  }

  if (intent === "previsit") {
    const previsitContext = buildPrevisitContext();

    if (env.ragGenerationProvider === "ollama") {
      try {
        return await buildAssistantReplyOllama({
          userText,
          retrieved: [],
          extraContext: previsitContext,
          systemHint: "Bạn là trợ lý phòng khám. Hướng dẫn người dùng chuẩn bị trước buổi khám dựa trên thông tin sau:",
          history,
        });
      } catch (_) {
        // fallback to template
      }
    }

    return {
      answer: previsitContext,
      citations: [],
      confidence: "high",
      provider: "previsit_tool",
      intent,
    };
  }

  // ─── Default: FAQ via RAG ─────────────────────────────────────────────────
  if (!focusedRetrieved.length) {
    return {
      answer:
        "Hiện tôi chưa tìm thấy thông tin phù hợp trong knowledge base của phòng khám. Bạn nên liên hệ trực tiếp phòng khám để được hỗ trợ.",
      citations: [],
      confidence: "low",
      provider: "template",
      intent,
    };
  }

  const primaryText = focusedRetrieved[0]?.content?.trim() || "";
  if (primaryText && primaryText.length <= 160) {
    return {
      ...buildAssistantReplyTemplate({ retrieved: focusedRetrieved }),
      intent,
    };
  }

  let fallbackReason = null;

  if (env.ragGenerationProvider === "ollama") {
    try {
      return { ...(await buildAssistantReplyOllama({ userText, retrieved: focusedRetrieved, history })), intent };
    } catch (error) {
      fallbackReason = error?.message || String(error);
      console.warn("[CHAT] Ollama generation failed, fallback to template:", error?.message || error);
    }
  }

  return {
    ...buildAssistantReplyTemplate({ retrieved: focusedRetrieved }),
    fallbackFrom: env.ragGenerationProvider,
    fallbackReason,
    intent,
  };
}

async function assertSessionAccess(sessionId, user) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      appointment: {
        select: {
          id: true,
          patientId: true,
          doctorId: true,
        },
      },
    },
  });

  if (!session) {
    throw createHttpError(404, "CHAT_SESSION_NOT_FOUND", "Chat session not found");
  }

  if (user.role === "ADMIN") return session;
  if (session.userId === user.id) return session;

  throw createHttpError(403, "FORBIDDEN", "You do not have permission to access this chat session");
}

function normalizeMessage(message) {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.content,
    toolName: message.toolName,
    toolArgs: message.toolArgs,
    citations: message.citations ?? [],
    createdAt: message.createdAt,
  };
}

export async function createChatSession({ user, appointmentId }) {
  if (appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, patientId: true },
    });

    if (!appointment) {
      throw createHttpError(404, "APPOINTMENT_NOT_FOUND", "Appointment not found");
    }

    if (user.role !== "ADMIN" && appointment.patientId !== user.id) {
      throw createHttpError(403, "FORBIDDEN", "You can only create chat for your appointment");
    }
  }

  return prisma.chatSession.create({
    data: {
      userId: user.id,
      appointmentId: appointmentId || null,
    },
  });
}

export async function getChatSession({ id, user }) {
  await assertSessionAccess(id, user);

  const session = await prisma.chatSession.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return {
    id: session.id,
    userId: session.userId,
    appointmentId: session.appointmentId,
    createdAt: session.createdAt,
    messages: session.messages.map(normalizeMessage),
  };
}

export async function processGuestMessage({ content, topK }) {
  const safeContent = stripPii(content);
  const intent = classifyIntent(safeContent);

  // Chỉ thực hiện RAG với intent faq
  const retrieved = intent === "faq" ? await retrieveTopKChunks({ query: safeContent, topK }) : [];
  const focusedRetrieved = focusRetrievedChunks(safeContent, retrieved);
  const reply = await buildAssistantReply({ userText: safeContent, retrieved: focusedRetrieved });

  return {
    userMessage: { id: `guest-u-${Date.now()}`, role: "USER", content: safeContent, citations: [], intent, createdAt: new Date().toISOString() },
    assistantMessage: {
      id: `guest-a-${Date.now()}`,
      role: "ASSISTANT",
      content: reply.answer,
      citations: reply.citations ?? [],
      intent: reply.intent,
      toolArgs: {
        intent,
        confidence: reply.confidence,
        generationProvider: reply.provider,
        fallbackFrom: reply.fallbackFrom ?? null,
        fallbackReason: reply.fallbackReason ?? null,
        showCitations: shouldShowCitations(reply),
      },
      createdAt: new Date().toISOString(),
    },
  };
}

export async function addChatMessage({ sessionId, user, content, topK }) {
  await assertSessionAccess(sessionId, user);

  const safeUserContent = stripPii(content);
  const intent = classifyIntent(safeUserContent);

  // Load last 6 messages as conversation history BEFORE saving the new message
  const historyRows = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { role: true, content: true },
  });
  const history = historyRows.reverse(); // restore chronological order

  const userMessage = await prisma.chatMessage.create({
    data: {
      sessionId,
      role: "USER",
      content: safeUserContent,
    },
  });

  // Chỉ thực hiện RAG khi intent là faq
  const retrieved = intent === "faq" ? await retrieveTopKChunks({ query: safeUserContent, topK }) : [];
  const focusedRetrieved = focusRetrievedChunks(safeUserContent, retrieved);

  const reply = await buildAssistantReply({ userText: safeUserContent, retrieved: focusedRetrieved, history });

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      sessionId,
      role: "ASSISTANT",
      content: reply.answer,
      citations: reply.citations,
      toolName: intent === "faq" ? "kb_retrieval" : `${intent}_tool`,
      toolArgs: {
        intent,
        topK: intent === "faq" ? topK : 0,
        usedChunks: focusedRetrieved.map((item) => ({ id: item.id, score: item.score })),
        confidence: reply.confidence,
        generationProvider: reply.provider,
        fallbackFrom: reply.fallbackFrom ?? null,
        fallbackReason: reply.fallbackReason ?? null,
        showCitations: shouldShowCitations(reply),
      },
    },
  });

  return {
    userMessage: normalizeMessage(userMessage),
    assistantMessage: normalizeMessage(assistantMessage),
  };
}
