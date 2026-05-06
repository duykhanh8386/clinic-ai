import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { signupStart } from "../../services/signup.service";
import { PASSWORD_REQUIREMENT_TEXT, validateStrongPassword } from "../../utils/password";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^(?:\+84|0)(?:[35789]\d)\d{7}$/.test(phone);
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "" });
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false, phone: false });

  const fullNameError = useMemo(() => {
    if (!touched.fullName) return "";
    if (!form.fullName.trim()) return "Full name is required";
    if (form.fullName.trim().length < 2) return "Full name is too short";
    return "";
  }, [form.fullName, touched.fullName]);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!form.email.trim()) return "Email is required";
    if (!isValidEmail(form.email.trim())) return "Invalid email format";
    return "";
  }, [form.email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) return "";
    return validateStrongPassword(form.password);
  }, [form.password, touched.password]);

  const phoneError = useMemo(() => {
    if (!touched.phone) return "";
    if (!form.phone) return "Phone is required";
    if (!isValidPhone(form.phone.trim())) return "Invalid phone format";
    return "";
  }, [form.phone, touched.phone]);

  const canSubmit =
    !fullNameError &&
    !emailError &&
    !passwordError &&
    !phoneError &&
    form.fullName &&
    form.email &&
    form.password &&
    form.phone;

  const mutation = useMutation({
    mutationFn: () =>
      signupStart({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
      }),
    onSuccess: (resp) => {
      const { signupId, resendAfterSec } = resp.data;
      navigate("/verify-email", {
        replace: true,
        state: { signupId, resendAfterSec, email: form.email.trim() },
      });
    },
  });

  const serverError = mutation.error?.response?.data?.error?.message || mutation.error?.message;

  const onSubmit = (e) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true, phone: true });
    if (!canSubmit) return;
    mutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-sky-50 via-white to-cyan-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-linear-to-r from-sky-400 to-cyan-400" />

          <div className="p-8 space-y-6">
            {/* Title */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-50 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Tạo tài khoản</h2>
              <p className="text-sm text-gray-500">
                Đã có tài khoản?{" "}
                <Link className="text-sky-600 font-medium hover:underline" to="/login">
                  Đăng nhập
                </Link>
              </p>
            </div>

            {serverError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {serverError}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 ${fullNameError ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"}`}
                    placeholder="Nguyễn Văn A"
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                    autoComplete="name"
                  />
                </div>
                {fullNameError && <p className="mt-1 text-xs text-red-500">{fullNameError}</p>}
              </div>

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

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.17 3.52a1 1 0 01-.24 1.03l-1.5 1.5a11 11 0 005.35 5.35l1.5-1.5a1 1 0 011.03-.24l3.52 1.17A1 1 0 0121 15.72V19a2 2 0 01-2 2h-1C9.16 21 3 14.84 3 7V6a1 1 0 000-1z" />
                    </svg>
                  </div>
                  <input
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 ${phoneError ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"}`}
                    placeholder="098xxxxxxx"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
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
                    placeholder="Ví dụ: Clinic@123"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    autoComplete="new-password"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">{PASSWORD_REQUIREMENT_TEXT}</p>
                {passwordError && <p className="mt-1 text-xs text-red-500">{passwordError}</p>}
              </div>

              <button
                className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition-all mt-2 ${
                  !canSubmit || mutation.isPending
                    ? "bg-sky-300 cursor-not-allowed"
                    : "bg-sky-500 hover:bg-sky-600 active:scale-[0.98] shadow-sm"
                }`}
                type="submit"
                disabled={!canSubmit || mutation.isPending}
              >
                {mutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Đang tạo tài khoản...
                  </span>
                ) : "Tạo tài khoản"}
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
