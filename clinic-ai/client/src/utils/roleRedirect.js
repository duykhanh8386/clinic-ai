export function roleHomePath(role) {
  if (role === "ADMIN") return "/dashboard/admin";
  if (role === "DOCTOR") return "/dashboard/doctor";
  return "/";
}