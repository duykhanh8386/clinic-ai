import { EmbeddingProvider } from "./embedding.provider.js";

const VECTOR_SIZE = 64;

function hashCharToIndex(charCode) {
  return ((charCode * 31) ^ (charCode >>> 3)) % VECTOR_SIZE;
}

function normalizeVector(vector) {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (!norm) return vector;
  return vector.map((v) => v / norm);
}

function textToVector(text) {
  const vector = new Array(VECTOR_SIZE).fill(0);
  for (const ch of String(text || "").toLowerCase()) {
    const code = ch.charCodeAt(0);
    const idx = Math.abs(hashCharToIndex(code));
    vector[idx] += 1;
  }
  return normalizeVector(vector);
}

export class MockEmbeddingProvider extends EmbeddingProvider {
  async embedText(text) {
    return textToVector(text);
  }

  async embedMany(texts) {
    return texts.map((t) => textToVector(t));
  }
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
  }

  return dot;
}
