export function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(value));
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateOnly(value) {
  if (!value) return "-";
  const isDateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function isDateInputValue(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const [year, month, day] = value.split("-").map(Number);
  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

export function toDateInputValue(date = new Date()) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysInputValue(days) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return toDateInputValue(value);
}

export function appointmentStatusLabel(status) {
  const mapping = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    DONE: "Hoàn tất",
    CANCELED: "Đã hủy",
  };
  return mapping[status] || status;
}

export function appointmentStatusClass(status) {
  const mapping = {
    PENDING: "badge-warning",
    CONFIRMED: "badge-info",
    DONE: "badge-success",
    CANCELED: "badge-error",
  };
  return mapping[status] || "badge-ghost";
}
