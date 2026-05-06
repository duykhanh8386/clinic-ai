import OpenAI from "openai";
import { EmbeddingProvider } from "./embedding.provider.js";

/**
 * Embedding provider using Ollama's OpenAI-compatible API.
 * Requires Ollama running locally (http://localhost:11434).
 * Recommended model: nomic-embed-text (768 dims)
 */
export class OllamaEmbeddingProvider extends EmbeddingProvider {
  constructor({ baseUrl = "http://localhost:11434", model = "nomic-embed-text" } = {}) {
    super();
    this.client = new OpenAI({
      baseURL: `${baseUrl}/v1`,
      apiKey: "ollama", // Ollama does not require a real API key
    });
    this.model = model;
  }

  async embedText(text) {
    const input = String(text || "").trim();
    if (!input) return [];

    const response = await this.client.embeddings.create({
      model: this.model,
      input,
    });

    return response.data?.[0]?.embedding || [];
  }

  async embedMany(texts) {
    const inputs = (texts || []).map((t) => String(t || "").trim()).filter(Boolean);
    if (!inputs.length) return [];

    const response = await this.client.embeddings.create({
      model: this.model,
      input: inputs,
    });

    return response.data.map((item) => item.embedding);
  }
}
