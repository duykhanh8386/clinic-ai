/**
 * Intent Router — Week 7 Deliverable
 *
 * Phân loại câu hỏi của người dùng thành một trong các intent:
 *   - "booking"     : hỏi về đặt lịch, bác sĩ, dịch vụ, slot trống
 *   - "previsit"    : hỏi về chuẩn bị trước khám, phiếu tiền khám
 *   - "emergency"   : dấu hiệu nguy hiểm → redirect cấp cứu ngay
 *   - "greeting"    : chào hỏi
 *   - "faq"         : câu hỏi chung về y tế, phòng khám (default)
 */

const BOOKING_PATTERNS = [
  /\b(đặt\s+lịch|book|đặt\s+hẹn|lịch\s+khám|thời\s+gian\s+khám|slot|giờ\s+trống|bác\s+sĩ\s+nào|chọn\s+bác\s+sĩ|dịch\s+vụ\s+nào|khám\s+dịch\s+vụ)\b/i,
  /\b(làm\s+thế\s+nào\s+(để\s+)?đặt|muốn\s+đặt|hướng\s+dẫn\s+đặt|các\s+bước\s+đặt)\b/i,
  /\b(phòng\s+khám\s+mở\s+cửa|giờ\s+làm\s+việc|giờ\s+hoạt\s+động|còn\s+chỗ\s+không|còn\s+lịch\s+không)\b/i,
];

const PREVISIT_PATTERNS = [
  /\b(chuẩn\s+bị|trước\s+khi\s+khám|phiếu\s+tiền\s+khám|previsit|điền\s+thông\s+tin|thông\s+tin\s+trước\s+khám)\b/i,
  /\b(cần\s+mang\s+theo|nhịn\s+ăn|uống\s+thuốc\s+trước|xét\s+nghiệm\s+trước)\b/i,
  /\b(khai\s+báo\s+triệu\s+chứng|điền\s+form|nhập\s+triệu\s+chứng|ghi\s+lý\s+do\s+khám)\b/i,
];

const EMERGENCY_SIGNALS = [
  /\b(khó\s+thở|đau\s+ngực|ngất|mất\s+ý\s+thức|co\s+giật|xuất\s+huyết\s+não|đột\s+quỵ|nhồi\s+máu)\b/i,
  /\b(chest\s+pain|shortness\s+of\s+breath|faint|unconscious|seizure|stroke)\b/i,
];

const GREETING_PATTERNS = [
  /^\s*(xin\s+chào|chào|hello|hi|alo|hey|chào\s+bác\s+sĩ|chào\s+phòng\s+khám)(\s+.*)?$/i,
];

/**
 * @param {string} text
 * @returns {"emergency" | "greeting" | "booking" | "previsit" | "faq"}
 */
export function classifyIntent(text) {
  const normalized = String(text || "").trim();

  for (const pattern of EMERGENCY_SIGNALS) {
    if (pattern.test(normalized)) return "emergency";
  }

  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(normalized)) return "greeting";
  }

  for (const pattern of BOOKING_PATTERNS) {
    if (pattern.test(normalized)) return "booking";
  }

  for (const pattern of PREVISIT_PATTERNS) {
    if (pattern.test(normalized)) return "previsit";
  }

  return "faq";
}
