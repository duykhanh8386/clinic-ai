export function normalizePhoneVN(input) {
  const raw = String(input ?? "").trim().replace(/\s+/g, "");
  if (!raw) return null;

  // +84xxxxxxxxx
  if (raw.startsWith("+84")) return raw;

  // 0xxxxxxxxx -> +84xxxxxxxxx
  if (raw.startsWith("0")) return "+84" + raw.slice(1);

  // 84xxxxxxxxx -> +84xxxxxxxxx
  if (raw.startsWith("84")) return "+84" + raw.slice(2);

  return null;
}

export function isValidVnMobile(phoneE164) {
  // +84 + (3/5/7/8/9) + 8 digits
  return /^\+84(?:[35789]\d)\d{7}$/.test(phoneE164);
}