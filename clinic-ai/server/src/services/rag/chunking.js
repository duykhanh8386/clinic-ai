export function chunkText(text, { chunkSize = 800, overlap = 120 } = {}) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const safeChunkSize = Math.max(100, Math.min(chunkSize, 4000));
  const safeOverlap = Math.max(0, Math.min(overlap, safeChunkSize - 1));
  const step = Math.max(1, safeChunkSize - safeOverlap);

  const chunks = [];
  let index = 0;

  while (index < normalized.length) {
    const startOffset = index;
    const endOffset = Math.min(index + safeChunkSize, normalized.length);
    const content = normalized.slice(startOffset, endOffset).trim();

    if (content) {
      chunks.push({
        chunkIndex: chunks.length,
        content,
        startOffset,
        endOffset,
      });
    }

    if (endOffset >= normalized.length) break;
    index += step;
  }

  return chunks;
}
