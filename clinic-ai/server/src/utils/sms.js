import twilio from "twilio";

export async function sendSmsOtp({ toE164, code }) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  await client.messages.create({
    from: process.env.TWILIO_FROM,
    to: toE164,
    body: `OTP: ${code} (het han trong ${process.env.OTP_TTL_MINUTES || 5} phut)`,
  });
}