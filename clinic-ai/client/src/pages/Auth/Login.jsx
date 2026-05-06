import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { login as loginApi, getMe } from "../../services/auth.service";
import { roleHomePath } from "../../utils/roleRedirect";
import { useBootAuth } from "../../context/useBootAuth.jsx";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Login() {
  const { setMe } = useBootAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });

  // Lấy ?redirect= từ URL query
  const redirectTo = new URLSearchParams(location.search).get("redirect") || null;

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!form.email.trim()) return "Email is required";
    if (!isValidEmail(form.email.trim())) return "Invalid email format";
    return "";
  }, [form.email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) return "";
    if (!form.password) return "Password is required";
    return "";
  }, [form.password, touched.password]);

  const canSubmit = !emailError && !passwordError && form.email && form.password;

  const mutation = useMutation({
    mutationFn: () => loginApi({ email: form.email.trim(), password: form.password }),
    onSuccess: async (resp) => {
      const { user, accessToken } = resp.data;
      localStorage.setItem("accessToken", accessToken);
      // Fetch full profile (includes doctorProfile.avatarUrl etc.)
      try {
        const fresh = await getMe();
        setMe(fresh.data); // setMe also persists to localStorage
      } catch {
        setMe(user);
      }
      // Nếu có redirect param VÀ role phù hợp (PATIENT) → dùng redirect
      if (redirectTo && user.role === "PATIENT") {
        navigate(redirectTo, { replace: true });
      } else {
        navigate(roleHomePath(user.role), { replace: true });
      }
    },
  });

  const serverError = mutation.error?.response?.data?.error?.message || mutation.error?.message;
  const resetSuccess = location.state?.resetSuccess;

  const onSubmit = (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!canSubmit) return;
    mutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-sky-50 via-white to-cyan-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-linear-to-r from-sky-400 to-cyan-400" />

          <div className="p-8 space-y-6">
            {/* Logo / Title */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-50 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Chào mừng trở lại</h2>
              <p className="text-sm text-gray-500">
                Chưa có tài khoản?{" "}
                <Link className="text-sky-600 font-medium hover:underline" to="/register">
                  Đăng ký ngay
                </Link>
              </p>
            </div>

            {resetSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Mật khẩu đã được cập nhật. Bạn hãy đăng nhập lại.
              </div>
            )}

            {serverError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {serverError}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 ${emailError ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"}`}
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
                {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 ${passwordError ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"}`}
                    placeholder="••••••••"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    autoComplete="current-password"
                  />
                </div>
                {passwordError && <p className="mt-1 text-xs text-red-500">{passwordError}</p>}
              </div>

              <div className="text-right">
                <Link className="text-xs text-sky-600 hover:underline" to="/forgot-password">
                  Quên mật khẩu?
                </Link>
              </div>

              <button
                className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition-all ${
                  !canSubmit || mutation.isPending
                    ? "bg-sky-300 cursor-not-allowed"
                    : "bg-sky-500 hover:bg-sky-600 active:scale-[0.98] shadow-sm"
                }`}
                disabled={!canSubmit || mutation.isPending}
              >
                {mutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Đang đăng nhập...
                  </span>
                ) : "Đăng nhập"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 ClinicAI. Bảo mật thông tin được đảm bảo.
        </p>
      </div>
    </div>
  );
}
