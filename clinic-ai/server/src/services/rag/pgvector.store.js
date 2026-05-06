import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";

let hasEnsuredPgvector = false;

function toVectorLiteral(values) {
  const dims = Number(env.ragEmbeddingDimensions) || 1536;
  const source = Array.isArray(values) ? values : [];

  const normalized = source.length >= dims
    ? source.slice(0, dims)
    : [...source, ...new Array(dims - source.length).fill(0)];

  return `[${normalized.map((v) => Number(v).toFixed(12)).join(",")}]`;
}

export async function ensurePgvectorStoreReady() {
  if (hasEnsuredPgvector) return;

  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "KbChunkVector" (
      "chunkId" TEXT PRIMARY KEY REFERENCES "KbChunk" (id) ON DELETE CASCADE,
      embedding vector(${env.ragEmbeddingDimensions}) NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "KbChunkVector_embedding_idx"
    ON "KbChunkVector"
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
  `);

  hasEnsuredPgvector = true;
}

export async function upsertChunkVector({ chunkId, embedding, tx = prisma }) {
  const vectorLiteral = toVectorLiteral(embedding);

  await tx.$executeRawUnsafe(
    `
      INSERT INTO "KbChunkVector" ("chunkId", embedding)
      VALUES ($1, $2::vector)
      ON CONFLICT ("chunkId")
      DO UPDATE SET embedding = EXCLUDED.embedding, "updatedAt" = NOW();
    `,
    chunkId,
    vectorLiteral
  );
}

export async function searchChunksByPgvector({ queryEmbedding, topK = 5 }) {
  const vectorLiteral = toVectorLiteral(queryEmbedding);
  const safeTopK = Math.max(1, Math.min(Number(topK) || 5, 10));

  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT
        c.id,
        c.content,
        c.meta,
        d.title,
        1 - (v.embedding <=> $1::vector) AS score
      FROM "KbChunkVector" v
      INNER JOIN "KbChunk" c ON c.id = v."chunkId"
      INNER JOIN "KbDocument" d ON d.id = c."documentId"
      WHERE d.status = 'PROCESSED'
      ORDER BY v.embedding <=> $1::vector
      LIMIT $2;
    `,
    vectorLiteral,
    safeTopK
  );

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    score: Number(row.score) || 0,
    title: row.title,
    chunkIndex: row.meta?.chunkIndex ?? null,
    meta: row.meta,
    citation: {
      title: row.title,
      chunkIndex: row.meta?.chunkIndex ?? null,
      snippet: String(row.content || "").slice(0, 240),
    },
  }));
}
