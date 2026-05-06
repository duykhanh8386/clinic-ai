import { createHttpError } from "./httpError.js";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function assertDateOnly(value, fieldName = "date") {
  if (!DATE_ONLY_REGEX.test(value)) {
    throw createHttpError(400, "INVALID_DATE", `${fieldName} must be in YYYY-MM-DD format`);
  }
}

export function assertTimeOnly(value, fieldName = "time") {
  if (!TIME_ONLY_REGEX.test(value)) {
    throw createHttpError(400, "INVALID_TIME", `${fieldName} must be in HH:mm format`);
  }
}

export function combineDateAndTime(dateString, timeString) {
  assertDateOnly(dateString, "date");
  assertTimeOnly(timeString, "time");

  const value = new Date(`${dateString}T${timeString}:00`);
  if (Number.isNaN(value.getTime())) {
    throw createHttpError(400, "INVALID_DATE_TIME", "Invalid date/time value");
  }

  return value;
}

export function startOfDay(dateString) {
  assertDateOnly(dateString, "date");
  return new Date(`${dateString}T00:00:00`);
}

export function endOfDay(dateString) {
  assertDateOnly(dateString, "date");
  return new Date(`${dateString}T23:59:59.999`);
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function minutesBetween(left, right) {
  return Math.floor((right.getTime() - left.getTime()) / 60000);
}

export function diffHoursFromNow(date) {
  return (date.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDatesInRange(from, to) {
  const result = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    result.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}