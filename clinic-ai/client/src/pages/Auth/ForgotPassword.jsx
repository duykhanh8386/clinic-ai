import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  requestPasswordReset,
  resendPasswordResetOtp,
  verifyPasswordResetOtp,
  confirmPasswordReset,
} from "../../services/passwordReset.service";
import { PASSWORD_REQUIREMENT_TEXT, validateStrongPassword } from "../../utils/password";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function onlyDigits6(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 6);
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [resetId, setResetId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const emailError = useMemo(() => {
    if (!emailTouched) return "";
    if (!email.trim()) return "Email is required";
    if (!isValidEmail(email.trim())) return "Invalid email format";
    return "";
  }, [email, emailTouched]);

  const passwordError = useMemo(() => {
    if (!passwordTouched) return "";
    return validateStrongPassword(password);
  }, [password, passwordTouched]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmTouched) return "";
    if (!confirmPassword) return "Confirm password is required";
    if (password !== confirmPassword) return "Confirm password does not match";
    return "";
  }, [password, confirmPassword, confirmTouched]);

  const requestMut = useMutation({
    mutationFn: () => requestPasswordReset(email.trim()),
    onSuccess: (resp) => {
      setResetId(resp.data.resetId);
      setCooldown(Number(resp.data.resendAfterSec || 60));
      setStep(2);
    },
  });

  const resendMut = useMutation({
    mutationFn: () => resendPasswordResetOtp(resetId),
    onSuccess: (resp) => {
      setCooldown(Number(resp.data.resendAfterSec || 60));
    },
  });

  const verifyMut = useMutation({
    mutationFn: () => verifyPasswordResetOtp({ resetId, code }),
    onSuccess: () => {
      setStep(3);
    },
  });

  const resetMut = useMutation({
    mutationFn: () => confirmPasswordReset({ resetId, password, confirmPassword }),
    onSuccess: () => {
      navigate("/login", {
        replace: true,
        state: { resetSuccess: true },
      });
    },
  });

  const serverError =
    requestMut.error?.response?.data?.error?.message ||
    resendMut.error?.response?.data?.error?.message ||
    verifyMut.error?.response?.data?.error?.message ||
    resetMut.error?.response?.data?.error?.message ||
    requestMut.error?.message ||
    resendMut.error?.message ||
    verifyMut.error?.message ||
    resetMut.error?.message;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-start justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-md bg-base-100 p-6 sm:p-8 rounded-2xl shadow space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Quên mật khẩu</h2>
          <p className="text-sm opacity-70">
            Nhập email, xác thực OTP, sau đó đặt mật khẩu mới.
          </p>
        </div>

        <ul className="steps steps-horizontal w-full text-sm">
          <li className={`step ${step >= 1 ? "step-primary" : ""}`}>Email</li>
          <li className={`step ${step >= 2 ? "step-primary" : ""}`}>OTP</li>
          <li className={`step ${step >= 3 ? "step-primary" : ""}`}>Mật khẩu mới</li>
        </ul>

        {serverError && (
          <div className="alert alert-error">
            <span>{serverError}</span>
          </div>
        )}

        {step === 1 && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setEmailTouched(true);
              if (emailError) return;
              requestMut.mutate();
            }}
          >
            <label className="form-control">
              <span className="label-text">Gmail / Email</span>
              <input
                className={`input input-bordered w-full ${emailError ? "input-error" : ""}`}
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                autoComplete="email"
                inputMode="email"
              />
              {emailError && <span className="text-error text-sm mt-1">{emailError}</span>}
            </label>

            <button className="btn btn-primary w-full" disabled={!!emailError || requestMut.isPending}>
              {requestMut.isPending ? "Đang gửi OTP..." : "Gửi OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-base-200 p-3 text-sm opacity-80">
              OTP đã gửi tới <span className="font-medium">{email}</span>
            </div>

            <label className="form-control">
              <span className="label-text">Mã OTP</span>
              <input
                className="input input-bordered w-full text-center tracking-[0.4em] text-lg"
                value={code}
                onChange={(e) => setCode(onlyDigits6(e.target.value))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="______"
              />
            </label>

            <button
              className="btn btn-primary w-full"
              disabled={code.length !== 6 || verifyMut.isPending}
              onClick={() => verifyMut.mutate()}
            >
              {verifyMut.isPending ? "Đang xác thực..." : "Xác thực OTP"}
            </button>

            <button
              className="btn btn-ghost w-full"
              disabled={cooldown > 0 || resendMut.isPending}
              onClick={() => resendMut.mutate()}
            >
              {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : resendMut.isPending ? "Đang gửi lại..." : "Gửi lại OTP"}
            </button>
          </div>
        )}

        {step === 3 && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setPasswordTouched(true);
              setConfirmTouched(true);
              if (passwordError || confirmPasswordError) return;
              resetMut.mutate();
            }}
          >
            <label className="form-control">
              <span className="label-text">Mật khẩu mới</span>
              <input
                className={`input input-bordered w-full ${passwordError ? "input-error" : ""}`}
                type="password"
                placeholder="Ví dụ: Clinic@123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                autoComplete="new-password"
              />
              <span className="text-xs opacity-70 mt-1">{PASSWORD_REQUIREMENT_TEXT}</span>
              {passwordError && <span className="text-error text-sm mt-1">{passwordError}</span>}
            </label>

            <label className="form-control">
              <span className="label-text">Xác nhận mật khẩu mới</span>
              <input
                className={`input input-bordered w-full ${confirmPasswordError ? "input-error" : ""}`}
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setConfirmTouched(true)}
                autoComplete="new-password"
              />
              {confirmPasswordError && (
                <span className="text-error text-sm mt-1">{confirmPasswordError}</span>
              )}
            </label>

            <button
              className="btn btn-primary w-full"
              disabled={!!passwordError || !!confirmPasswordError || resetMut.isPending}
            >
              {resetMut.isPending ? "Đang cập nhật..." : "Đổi mật khẩu"}
            </button>
          </form>
        )}

        <div className="text-center text-sm">
          <Link className="link link-hover" to="/login">
            Quay về đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
