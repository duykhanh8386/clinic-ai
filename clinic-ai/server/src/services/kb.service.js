import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { createHttpError } from "../utils/httpError.js";
import { chunkText } from "./rag/chunking.js";
import { getEmbeddingProvider } from "./rag/provider.factory.js";
import { ensurePgvectorStoreReady, upsertChunkVector } from "./rag/pgvector.store.js";
import * as XLSX from "xlsx";

const embeddingProvider = getEmbeddingProvider();

const TITLE_HEADERS = new Set([
  "title",
  "tieu de",
  "tieude",
  "chu de",
  "chude",
  "question",
  "cau hoi",
  "cauhoi",
  "faq",
]);

const CONTENT_HEADERS = new Set([
  "content",
  "noi dung",
  "noidung",
  "answer",
  "tra loi",
  "traloi",
  "solution",
  "giai phap",
  "giaiphap",
  "mo ta",
  "mota",
]);

const QUESTION_HEADERS = new Set(["question", "cau hoi", "cauhoi", "faq"]);
const ANSWER_HEADERS = new Set(["answer", "tra loi", "traloi", "solution", "giai phap", "giaiphap"]);

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function toBool(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (value == null || value === "") return fallback;
  return ["true", "1", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function normalizeHeader(value) {
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

function getByHeaders(normalizedRow, headers) {
  for (const header of headers) {
    const value = normalizedRow[header];
    if (String(value || "").trim()) return String(value).trim();
  }
  return "";
}

function normalizeExcelRow(row) {
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeader(key)] = value;
  }
  return normalized;
}

function buildDocumentFromRow(row, index) {
  const normalized = normalizeExcelRow(row);
  const question = getByHeaders(normalized, QUESTION_HEADERS);
  const answer = getByHeaders(normalized, ANSWER_HEADERS);
  const rawTitle = getByHeaders(normalized, TITLE_HEADERS);
  const rawContent = getByHeaders(normalized, CONTENT_HEADERS);

  const title = (rawTitle || question || `Tài liệu KB ${index + 1}`).slice(0, 255).trim();
  let content = rawContent;

  if (question && answer) {
    content = `Câu hỏi: ${question}\nTrả lời: ${answer}`;
  } else if (question && rawContent && question !== rawContent) {
    content = `Câu hỏi: ${question}\nNội dung: ${rawContent}`;
  }

  if (!content) {
    content = Object.entries(row)
      .map(([key, value]) => `${key}: ${String(value || "").trim()}`)
      .filter((line) => !line.endsWith(":"))
      .join("\n");
  }

  return {
    title,
    content: String(content || "").trim(),
  };
}

function parseExcelDocuments(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw createHttpError(400, "EMPTY_EXCEL_FILE", "File Excel không có sheet nào");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  if (!rows.length) {
    throw createHttpError(400, "EMPTY_EXCEL_FILE", "File Excel không có dữ liệu");
  }

  const documents = [];
  const skippedRows = [];

  rows.forEach((row, index) => {
    const document = buildDocumentFromRow(row, index);
    if (document.title.length < 3 || document.content.length < 3) {
      skippedRows.push(index + 2);
      return;
    }
    documents.push(document);
  });

  if (!documents.length) {
    throw createHttpError(
      400,
      "NO_VALID_KB_ROWS",
      "Không tìm thấy dòng hợp lệ. File cần có cột Tiêu đề/Nội dung hoặc Câu hỏi/Trả lời"
    );
  }

  return { documents, skippedRows };
}

export async function createDocument({ title, type, content }) {
  return prisma.kbDocument.create({
    data: {
      title,
      type,
      content,
      status: "PENDING",
    },
  });
}

export async function updateDocument({ id, title, content, autoProcess = true }) {
  const existed = await prisma.kbDocument.findUnique({ where: { id }, select: { id: true } });
  if (!existed) {
    throw createHttpError(404, "KB_DOCUMENT_NOT_FOUND", "Knowledge base document not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.kbChunk.deleteMany({ where: { documentId: id } });
    await tx.kbDocument.update({
      where: { id },
      data: {
        title,
        content,
        status: "PENDING",
        error: null,
      },
    });
  });

  if (autoProcess) {
    await processDocument({ id, chunkSize: 800, overlap: 120 });
  }

  return getDocument({ id });
}

export async function importDocumentsFromExcel({ file, autoProcess = true }) {
  if (!file?.buffer) {
    throw createHttpError(400, "KB_IMPORT_FILE_REQUIRED", "Vui lòng chọn file Excel để import");
  }

  const { documents, skippedRows } = parseExcelDocuments(file.buffer);
  const shouldProcess = toBool(autoProcess, true);
  const imported = [];
  const failed = [];

  for (const item of documents) {
    const created = await createDocument({
      title: item.title,
      type: "TEXT",
      content: item.content,
    });

    if (!shouldProcess) {
      imported.push(created);
      continue;
    }

    try {
      const processed = await processDocument({
        id: created.id,
        chunkSize: 800,
        overlap: 120,
      });
      imported.push(processed);
    } catch (error) {
      imported.push(created);
      failed.push({
        id: created.id,
        title: created.title,
        error: error?.message || "Processing failed",
      });
    }
  }

  return {
    importedCount: imported.length,
    processedCount: shouldProcess ? imported.length - failed.length : 0,
    failedCount: failed.length,
    skippedRows,
    documents: imported,
    failed,
  };
}

export async function processDocument({ id, chunkSize, overlap }) {
  const document = await prisma.kbDocument.findUnique({ where: { id } });
  if (!document) {
    throw createHttpError(404, "KB_DOCUMENT_NOT_FOUND", "Knowledge base document not found");
  }

  await prisma.kbDocument.update({
    where: { id },
    data: { status: "PROCESSING", error: null },
  });

  try {
    let usePgvector = env.ragRetrievalProvider === "pgvector";
    if (usePgvector) {
      try {
        await ensurePgvectorStoreReady();
      } catch (error) {
        usePgvector = false;
        console.warn("[RAG] pgvector init failed, fallback to json float[] storage:", error?.message || error);
      }
    }

    const chunks = chunkText(document.content, { chunkSize, overlap });
    const vectors = await embeddingProvider.embedMany(chunks.map((c) => c.content));

    await prisma.$transaction(async (tx) => {
      await tx.kbChunk.deleteMany({ where: { documentId: id } });

      if (chunks.length > 0) {
        for (let index = 0; index < chunks.length; index += 1) {
          const chunk = chunks[index];
          const embedding = vectors[index] || [];

          const created = await tx.kbChunk.create({
            data: {
              documentId: id,
              content: chunk.content,
              embedding,
              meta: {
                title: document.title,
                chunkIndex: chunk.chunkIndex,
                startOffset: chunk.startOffset,
                endOffset: chunk.endOffset,
              },
            },
          });

          if (usePgvector) {
            await upsertChunkVector({ chunkId: created.id, embedding, tx });
          }
        }
      }

      await tx.kbDocument.update({
        where: { id },
        data: { status: "PROCESSED", error: null },
      });
    });

    return prisma.kbDocument.findUnique({
      where: { id },
      include: { _count: { select: { chunks: true } } },
    });
  } catch (error) {
    await prisma.kbDocument.update({
      where: { id },
      data: { status: "FAILED", error: error.message || "Processing failed" },
    });
    throw error;
  }
}

export async function listDocuments({ page = 1, limit = 10, status, search }) {
  const safePage = toInt(page, 1);
  const safeLimit = Math.min(toInt(limit, 10), 50);

  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.kbDocument.count({ where }),
    prisma.kbDocument.findMany({
      where,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    }),
  ]);

  return {
    items,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

export async function getDocument({ id }) {
  const document = await prisma.kbDocument.findUnique({
    where: { id },
    include: {
      _count: { select: { chunks: true } },
      chunks: {
        select: {
          id: true,
          content: true,
          meta: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!document) {
    throw createHttpError(404, "KB_DOCUMENT_NOT_FOUND", "Knowledge base document not found");
  }

  return {
    ...document,
    chunks: [...document.chunks].sort((a, b) => {
      const aIndex = Number(a.meta?.chunkIndex ?? 0);
      const bIndex = Number(b.meta?.chunkIndex ?? 0);
      return aIndex - bIndex;
    }),
  };
}

export async function deleteDocument({ id }) {
  const existed = await prisma.kbDocument.findUnique({ where: { id }, select: { id: true } });
  if (!existed) {
    throw createHttpError(404, "KB_DOCUMENT_NOT_FOUND", "Knowledge base document not found");
  }

  await prisma.kbDocument.delete({ where: { id } });

  return { id };
}
