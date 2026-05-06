import crypto from "crypto";

export function generateOtp6() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp({
  code,
  email,
  target,
  purpose = "GENERAL",
  secret = process.env.OTP_SECRET || "dev",
}) {
  const resolvedTarget = String(email ?? target ?? "").trim().toLowerCase();

  return crypto
    .createHash("sha256")
    .update(`${code}:${secret}:${purpose}:${resolvedTarget}`)
    .digest("hex");
}
