import dotenv from "dotenv";

dotenv.config({ quiet: true });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 4000),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  bookingCancelMinHours: toNumber(process.env.BOOKING_CANCEL_MIN_HOURS, 2),
  bookingRescheduleMinHours: toNumber(process.env.BOOKING_RESCHEDULE_MIN_HOURS, 2),
  bookingGenerateMaxDays: toNumber(process.env.BOOKING_GENERATE_MAX_DAYS, 31),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  ragEmbeddingProvider: process.env.RAG_EMBEDDING_PROVIDER ?? "mock",
  ragRetrievalProvider: process.env.RAG_RETRIEVAL_PROVIDER ?? "mock",
  ragGenerationProvider: process.env.RAG_GENERATION_PROVIDER ?? "template",
  ragEmbeddingDimensions: toNumber(process.env.RAG_EMBEDDING_DIMENSIONS, 768),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text",
  ollamaChatModel: process.env.OLLAMA_CHAT_MODEL ?? "qwen3:4b",
};