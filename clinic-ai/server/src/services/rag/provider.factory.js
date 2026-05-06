import { env } from "../../config/env.js";
import { MockEmbeddingProvider } from "./mockEmbedding.provider.js";
import { OllamaEmbeddingProvider } from "./ollamaEmbedding.provider.js";

let cachedProvider = null;

export function getEmbeddingProvider() {
  if (cachedProvider) return cachedProvider;

  try {
    if (env.ragEmbeddingProvider === "ollama") {
      cachedProvider = new OllamaEmbeddingProvider({
        baseUrl: env.ollamaBaseUrl,
        model: env.ollamaEmbeddingModel,
      });
      return cachedProvider;
    }
  } catch (error) {
    console.warn("[RAG] Failed to initialize configured embedding provider, fallback to mock:", error?.message || error);
  }

  cachedProvider = new MockEmbeddingProvider();
  return cachedProvider;
}
