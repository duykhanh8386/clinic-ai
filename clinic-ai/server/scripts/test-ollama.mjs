import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ path: ".env" });

const BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const EMBED_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama3.2:3b";

console.log("--- Ollama Env Check ---");
console.log("OLLAMA_BASE_URL:       ", BASE_URL);
console.log("OLLAMA_EMBEDDING_MODEL:", EMBED_MODEL);
console.log("OLLAMA_CHAT_MODEL:     ", CHAT_MODEL);
console.log("RAG_EMBEDDING_PROVIDER:", process.env.RAG_EMBEDDING_PROVIDER || "<unset>");
console.log("RAG_GENERATION_PROVIDER:", process.env.RAG_GENERATION_PROVIDER || "<unset>");
console.log("");

const client = new OpenAI({ baseURL: `${BASE_URL}/v1`, apiKey: "ollama" });

// 1. Check Ollama running
try {
  const res = await fetch(`${BASE_URL}/api/tags`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const modelNames = (json.models || []).map((m) => m.name);
  console.log("Ollama running: OK");
  console.log("Available models:", modelNames.join(", ") || "(none pulled yet)");
  console.log("");

  const hasChatModel = modelNames.some((n) => n.startsWith(CHAT_MODEL.split(":")[0]));
  const hasEmbedModel = modelNames.some((n) => n.startsWith(EMBED_MODEL.split(":")[0]));

  if (!hasChatModel) {
    console.warn(`WARNING: Chat model "${CHAT_MODEL}" not found. Pull with:`);
    console.warn(`  ollama pull ${CHAT_MODEL}`);
    console.warn("");
  }
  if (!hasEmbedModel) {
    console.warn(`WARNING: Embedding model "${EMBED_MODEL}" not found. Pull with:`);
    console.warn(`  ollama pull ${EMBED_MODEL}`);
    console.warn("");
  }
} catch (err) {
  console.error("Ollama running: FAIL");
  console.error("Cannot reach Ollama at", BASE_URL);
  console.error("Make sure Ollama is installed and running: https://ollama.com/download");
  console.error("Then run: ollama serve");
  process.exit(1);
}

// 2. Test embedding (only if RAG_EMBEDDING_PROVIDER=ollama)
const embeddingProvider = process.env.RAG_EMBEDDING_PROVIDER || "mock";
if (embeddingProvider === "ollama") {
  try {
    const response = await client.embeddings.create({ model: EMBED_MODEL, input: "xin chao phong kham" });
    const vec = response.data?.[0]?.embedding || [];
    console.log("Embedding call: OK");
    console.log("Embedding dimensions:", vec.length);
    console.log("");
  } catch (err) {
    console.error("Embedding call: FAIL");
    console.error("Reason:", err?.status || "", err?.message || err);
    console.error(`Make sure the model is pulled: ollama pull ${EMBED_MODEL}`);
    process.exit(2);
  }
} else {
  console.log(`Embedding call: SKIP (RAG_EMBEDDING_PROVIDER=${embeddingProvider})`);
  console.log("");
}

// 3. Test chat generation
try {
  const completion = await client.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.1,
    messages: [{ role: "user", content: "Tra loi dung 5 tu: ban dang chay ollama local" }],
  });
  const text = completion.choices?.[0]?.message?.content?.trim() || "<empty>";
  console.log("Chat call: OK");
  console.log("Chat response:", text);
  console.log("");
} catch (err) {
  console.error("Chat call: FAIL");
  console.error("Reason:", err?.status || "", err?.message || err);
  console.error(`Make sure the model is pulled: ollama pull ${CHAT_MODEL}`);
  process.exit(3);
}

console.log("PASS: Ollama is running and both embedding + chat are working.");
