export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENT_TEXT =
  "Mật khẩu phải có ít nhất 8 ký tự, gồm ít nhất 1 số và 1 ký tự đặc biệt.";

export function validateStrongPassword(password) {
  if (!password) return "Password is required";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/\d/.test(password)) {
    return "Password must include at least 1 number";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least 1 special character";
  }
  return "";
}
