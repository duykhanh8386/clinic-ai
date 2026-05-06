import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { MockEmbeddingProvider, cosineSimilarity } from "./mockEmbedding.provider.js";
import { getEmbeddingProvider } from "./provider.factory.js";
import { ensurePgvectorStoreReady, searchChunksByPgvector } from "./pgvector.store.js";

const defaultEmbeddingProvider = getEmbeddingProvider();

const STOP_WORDS = new Set([
  "la",
  "gi",
  "co",
  "khong",
  "toi",
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

function lexicalScore(query, text) {
  const normalizedQuery = normalizeText(query);
  const normalizedText = normalizeText(text);
  if (!normalizedQuery || !normalizedText) return 0;

  const queryTokens = tokenize(normalizedQuery);
  if (!queryTokens.length) return normalizedText.includes(normalizedQuery) ? 1 : 0;

  const textWords = new Set(normalizedText.split(" ").filter(Boolean));
  let matched = 0;

  for (const token of queryTokens) {
    if (textWords.has(token)) {
      matched += 1;
    } else if (token.length >= 4 && normalizedText.includes(token)) {
      matched += 0.6;
    }
  }

  const coverage = matched / queryTokens.length;
  const phraseBoost = normalizedText.includes(normalizedQuery) ? 1 : 0;
  return coverage + phraseBoost;
}

function titleCoverage(query, title) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return 0;

  const titleTokens = new Set(tokenize(title));
  const matched = queryTokens.filter((token) => titleTokens.has(token)).length;
  return matched / queryTokens.length;
}

function hasExactPhrase(query, text) {
  const normalizedQuery = normalizeText(query);
  const normalizedText = normalizeText(text);
  if (normalizedQuery.length < 3) return false;
  if (normalizedText.includes(normalizedQuery)) return true;

  const queryTokens = tokenize(query);
  for (let index = 0; index < queryTokens.length - 1; index += 1) {
    const phrase = `${queryTokens[index]} ${queryTokens[index + 1]}`;
    if (normalizedText.includes(phrase)) return true;
  }

  return false;
}

async function loadProcessedChunks() {
  return prisma.kbChunk.findMany({
    include: {
      document: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
    where: {
      document: { status: "PROCESSED" },
    },
  });
}

function toRetrievedChunk({ chunk, score }) {
  return {
    id: chunk.id,
    documentId: chunk.document.id,
    content: chunk.content,
    score,
    title: chunk.document.title,
    chunkIndex: chunk.meta?.chunkIndex ?? null,
    meta: chunk.meta,
    citation: {
      title: chunk.document.title,
      chunkIndex: chunk.meta?.chunkIndex ?? null,
      snippet: chunk.content.slice(0, 240),
    },
  };
}

function compareScoredChunks(a, b) {
  const scoreDiff = b.score - a.score;
  const aIndex = Number(a.chunk.meta?.chunkIndex ?? 0);
  const bIndex = Number(b.chunk.meta?.chunkIndex ?? 0);

  if (a.chunk.document.id === b.chunk.document.id && Math.abs(scoreDiff) < 0.25) {
    return aIndex - bIndex;
  }

  return scoreDiff;
}

async function retrieveLexicalChunks({ query, topK }) {
  const chunks = await loadProcessedChunks();

  const scored = chunks
    .map((chunk) => {
      const titleScore = lexicalScore(query, chunk.document.title);
      const contentScore = lexicalScore(query, chunk.content);
      const coverage = titleCoverage(query, chunk.document.title);
      return {
        chunk,
        exactPhrase: hasExactPhrase(query, `${chunk.document.title}\n${chunk.content}`),
        score: titleScore * 2 + contentScore + (coverage === 1 ? 2 : coverage),
      };
    })
    .filter((item) => item.score > 0)
    .sort(compareScoredChunks);

  const exactMatches = scored.filter((item) => item.exactPhrase);

  return (exactMatches.length > 0 ? exactMatches : scored)
    .slice(0, topK)
    .map(toRetrievedChunk);
}

function mergeRetrievedChunks(primary, secondary, topK) {
  const byId = new Map();

  for (const item of [...primary, ...secondary]) {
    const existing = byId.get(item.id);
    if (!existing || item.score > existing.score) {
      byId.set(item.id, item);
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

async function embedQuery(query, embeddingProvider) {
  try {
    return {
      vector: await embeddingProvider.embedText(query),
      usedMock: embeddingProvider instanceof MockEmbeddingProvider || env.ragEmbeddingProvider === "mock",
    };
  } catch (error) {
    console.warn("[RAG] query embedding failed, fallback to lexical/mock retrieval:", error?.message || error);
    const mockProvider = new MockEmbeddingProvider();
    return {
      vector: await mockProvider.embedText(query),
      usedMock: true,
    };
  }
}

export async function retrieveTopKChunks({ query, topK = 5, embeddingProvider = defaultEmbeddingProvider }) {
  const safeTopK = Math.max(1, Math.min(topK, 10));

  if (env.ragRetrievalProvider === "pgvector") {
    try {
      const provider = getEmbeddingProvider();
      const qVector = await provider.embedText(query);
      await ensurePgvectorStoreReady();
      const vectorResults = await searchChunksByPgvector({ queryEmbedding: qVector, topK: safeTopK });
      const lexicalResults = await retrieveLexicalChunks({ query, topK: safeTopK });
      return mergeRetrievedChunks(vectorResults, lexicalResults, safeTopK);
    } catch (error) {
      console.warn("[RAG] pgvector retrieval failed, fallback to hybrid retrieval:", error?.message || error);
    }
  }

  const { vector: qVector, usedMock } = await embedQuery(query, embeddingProvider);
  const chunks = await loadProcessedChunks();

  let scored = chunks
    .map((chunk) => {
      const titleScore = lexicalScore(query, chunk.document.title);
      const contentScore = lexicalScore(query, chunk.content);
      const coverage = titleCoverage(query, chunk.document.title);
      const vectorScore = cosineSimilarity(qVector, chunk.embedding || []);
      const lexicalTotal = titleScore * 2 + contentScore + (coverage === 1 ? 2 : coverage);

      return {
        chunk,
        exactPhrase: hasExactPhrase(query, `${chunk.document.title}\n${chunk.content}`),
        vectorScore,
        lexicalTotal,
        score: lexicalTotal * 2 + vectorScore,
      };
    })
    .filter((item) => item.lexicalTotal > 0 || (!usedMock && item.vectorScore > 0.2))
    .sort(compareScoredChunks);

  const exactMatches = scored.filter((item) => item.exactPhrase);
  if (exactMatches.length > 0) {
    scored = exactMatches;
  }

  scored = scored.slice(0, safeTopK);

  return scored.map(({ chunk, score }) => toRetrievedChunk({ chunk, score }));
}
