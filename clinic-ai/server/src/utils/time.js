export function toMs(duration) {
  // hỗ trợ: "15m", "7d", "60s", "2h" (chỉ cần các loại bạn dùng)
  const s = String(duration).trim();
  const m = s.match(/^(\d+)\s*([smhd])$/i);
  if (!m) throw new Error(`Invalid duration: ${duration}`);
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const map = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * map[unit];
}