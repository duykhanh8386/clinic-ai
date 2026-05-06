import sgMail from "@sendgrid/mail";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date) {
  return new Date(date).toLocaleString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

const footer = `
  <div style="background-color:#f9f9f9;padding:20px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee;">
    <p style="margin:4px 0;">© 2026 ClinicAI Medical System. All rights reserved.</p>
    <p style="margin:4px 0;">Health City, Vietnam</p>
  </div>`;

const header = (title) => `
  <div style="background-color:#00466a;padding:20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">${title}</h1>
  </div>`;

// ─── Appointment confirmation (gửi bệnh nhân khi đặt lịch thành công) ────────

function getBookingConfirmTemplate({ patientName, doctorName, serviceName, slotStartAt, reason }) {
  return `
  <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    ${header("✅ Đặt lịch thành công")}
    <div style="padding:28px;color:#333;line-height:1.7;">
      <p>Xin chào <strong>${patientName}</strong>,</p>
      <p>Lịch hẹn của bạn đã được đặt thành công. Thông tin chi tiết:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;width:40%;">Bác sĩ</td><td style="padding:8px;">${doctorName}</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;">Dịch vụ</td><td style="padding:8px;">${serviceName}</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;">Thời gian</td><td style="padding:8px;">${formatDate(slotStartAt)}</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;">Lý do khám</td><td style="padding:8px;">${reason || "—"}</td></tr>
      </table>
      <p style="background:#e8f5e9;padding:12px;border-radius:6px;font-size:14px;">
        💡 Bạn có thể điền <strong>phiếu tiền khám</strong> trên hệ thống để bác sĩ chuẩn bị tốt hơn trước buổi khám.
      </p>
      <p>Nếu có thay đổi kế hoạch, vui lòng hủy hoặc đổi lịch ít nhất 2 giờ trước giờ hẹn.</p>
    </div>
    ${footer}
  </div>`;
}

// ─── Appointment confirmed by doctor/admin ────────────────────────────────

function getAppointmentConfirmedTemplate({ patientName, doctorName, serviceName, slotStartAt }) {
  return `
  <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    ${header("🩺 Lịch hẹn đã được xác nhận")}
    <div style="padding:28px;color:#333;line-height:1.7;">
      <p>Xin chào <strong>${patientName}</strong>,</p>
      <p>Bác sĩ <strong>${doctorName}</strong> đã xác nhận lịch hẹn của bạn:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;width:40%;">Dịch vụ</td><td style="padding:8px;">${serviceName}</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;">Thời gian khám</td><td style="padding:8px;"><strong>${formatDate(slotStartAt)}</strong></td></tr>
      </table>
      <p style="background:#e3f2fd;padding:12px;border-radius:6px;font-size:14px;">
        📋 Nhớ đến đúng giờ và mang theo giấy tờ tùy thân nếu cần thiết.
      </p>
    </div>
    ${footer}
  </div>`;
}

// ─── Appointment cancelled ─────────────────────────────────────────────────

function getAppointmentCancelledTemplate({ patientName, doctorName, serviceName, slotStartAt, cancelNote }) {
  return `
  <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    ${header("❌ Lịch hẹn đã bị hủy")}
    <div style="padding:28px;color:#333;line-height:1.7;">
      <p>Xin chào <strong>${patientName}</strong>,</p>
      <p>Lịch hẹn của bạn đã bị hủy. Thông tin chi tiết:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;width:40%;">Bác sĩ</td><td style="padding:8px;">${doctorName}</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;">Dịch vụ</td><td style="padding:8px;">${serviceName}</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;">Thời gian đã đặt</td><td style="padding:8px;">${formatDate(slotStartAt)}</td></tr>
        ${cancelNote ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;">Lý do hủy</td><td style="padding:8px;">${cancelNote}</td></tr>` : ""}
      </table>
      <p>Bạn có thể đặt lịch mới trên hệ thống ClinicAI bất cứ lúc nào.</p>
    </div>
    ${footer}
  </div>`;
}

// ─── Appointment reminder (gửi trước 24h) ─────────────────────────────────

function getAppointmentReminderTemplate({ patientName, doctorName, serviceName, slotStartAt }) {
  return `
  <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    ${header("⏰ Nhắc nhở: Lịch khám ngày mai")}
    <div style="padding:28px;color:#333;line-height:1.7;">
      <p>Xin chào <strong>${patientName}</strong>,</p>
      <p>Đây là nhắc nhở lịch hẹn của bạn vào <strong>ngày mai</strong>:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;width:40%;">Bác sĩ</td><td style="padding:8px;">${doctorName}</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;">Dịch vụ</td><td style="padding:8px;">${serviceName}</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold;">Thời gian</td><td style="padding:8px;"><strong>${formatDate(slotStartAt)}</strong></td></tr>
      </table>
      <p style="background:#fff3e0;padding:12px;border-radius:6px;font-size:14px;">
        ⚠️ Nếu không thể đến, vui lòng hủy lịch sớm để bác sĩ phục vụ bệnh nhân khác.
      </p>
    </div>
    ${footer}
  </div>`;
}

// ─── OTP template ──────────────────────────────────────────────────────────

const getOtpTemplate = (code) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #00466a; padding: 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ClinicAI Verification</h1>
    </div>
    <div style="padding: 30px; color: #333333; line-height: 1.6;">
      <p style="font-size: 16px;">Hello,</p>
      <p style="font-size: 16px;">Please use the verification code below to complete your action. This code will expire in ${process.env.OTP_TTL_MINUTES || 5} minutes.</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; background-color: #f4f4f4; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #00466a; border-radius: 4px; border: 1px dashed #00466a;">${code}</span>
      </div>
      <p style="font-size: 14px; color: #666666;">If you didn't request this code, please ignore this email.</p>
    </div>
    <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #eeeeee;">
      <p style="margin: 5px 0;">© 2026 ClinicAI Medical System. All rights reserved.</p>
      <p style="margin: 5px 0;">Health City, Vietnam</p>
    </div>
  </div>
`;

let inited = false;
function init() {
  if (inited) return;
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  inited = true;
}

async function sendMail({ to, subject, text, html }) {
  init();
  try {
    await sgMail.send({
      to,
      from: { email: process.env.SENDGRID_FROM, name: "ClinicAI" },
      subject,
      text,
      html,
    });
  } catch (e) {
    // Không throw để tránh ảnh hưởng flow chính khi SENDGRID lỗi
    console.error("[MAILER] SENDGRID_ERROR status:", e?.code);
    console.error("[MAILER] SENDGRID_ERROR body:", e?.response?.body ?? e?.message);
  }
}

export async function sendEmailOtp({ to, code }) {
  init();
  try {
    await sgMail.send({
      to,
      from: { email: process.env.SENDGRID_FROM, name: "ClinicAI Support" },
      subject: `[ClinicAI] Mã xác thực: ${code}`,
      text: `Mã xác thực của bạn là: ${code}`,
      html: getOtpTemplate(code),
    });
  } catch (e) {
    console.error("SENDGRID_ERROR_STATUS:", e?.code);
    console.error("SENDGRID_ERROR_BODY:", e?.response?.body);
    throw e;
  }
}

// ─── Appointment email senders ─────────────────────────────────────────────

export function sendBookingConfirmEmail({ to, patientName, doctorName, serviceName, slotStartAt, reason }) {
  return sendMail({
    to,
    subject: "[ClinicAI] ✅ Đặt lịch khám thành công",
    text: `Bạn đã đặt lịch khám thành công với bác sĩ ${doctorName} vào ${formatDate(slotStartAt)}.`,
    html: getBookingConfirmTemplate({ patientName, doctorName, serviceName, slotStartAt, reason }),
  });
}

export function sendAppointmentConfirmedEmail({ to, patientName, doctorName, serviceName, slotStartAt }) {
  return sendMail({
    to,
    subject: "[ClinicAI] 🩺 Lịch khám đã được xác nhận",
    text: `Bác sĩ ${doctorName} đã xác nhận lịch khám của bạn vào ${formatDate(slotStartAt)}.`,
    html: getAppointmentConfirmedTemplate({ patientName, doctorName, serviceName, slotStartAt }),
  });
}

export function sendAppointmentCancelledEmail({ to, patientName, doctorName, serviceName, slotStartAt, cancelNote }) {
  return sendMail({
    to,
    subject: "[ClinicAI] ❌ Lịch khám đã bị hủy",
    text: `Lịch khám với bác sĩ ${doctorName} vào ${formatDate(slotStartAt)} đã bị hủy.`,
    html: getAppointmentCancelledTemplate({ patientName, doctorName, serviceName, slotStartAt, cancelNote }),
  });
}

export function sendAppointmentReminderEmail({ to, patientName, doctorName, serviceName, slotStartAt }) {
  return sendMail({
    to,
    subject: "[ClinicAI] ⏰ Nhắc nhở lịch khám ngày mai",
    text: `Nhắc nhở: Bạn có lịch khám với bác sĩ ${doctorName} vào ${formatDate(slotStartAt)}.`,
    html: getAppointmentReminderTemplate({ patientName, doctorName, serviceName, slotStartAt }),
  });
}