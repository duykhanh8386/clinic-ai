import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { signupResend, signupVerify } from "../../services/signup.service";
import { getMe } from "../../services/auth.service";
import { roleHomePath } from "../../utils/roleRedirect";
import { useBootAuth } from "../../context/useBootAuth";

function onlyDigits6(s) {
  return String(s ?? "").replace(/\D/g, "").slice(0, 6);
}

export default function VerifyEmail() {
  const nav = useNavigate();
  const { state } = useLocation();
  const signupId = state?.signupId;
  const email = state?.email || "";
  const initialCooldown = Number(state?.resendAfterSec || 60);
  const { setMe } = useBootAuth();
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(initialCooldown);

  useEffect(() => {
    if (!signupId) nav("/register", { replace: true });
  }, [signupId, nav]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const canVerify = useMemo(() => code.length === 6 && !!signupId, [code, signupId]);

  const verifyMut = useMutation({
    mutationFn: () => signupVerify({ signupId, code }),
    onSuccess: async (resp) => {
      const { user, accessToken } = resp.data;
      localStorage.setItem("accessToken", accessToken);
      try {
        const fresh = await getMe();
        setMe(fresh.data);
      } catch {
        setMe(user);
      }
      nav(roleHomePath(user.role), { replace: true });
    },
  });

  const resendMut = useMutation({
    mutationFn: () => signupResend(signupId),
    onSuccess: (resp) => setCooldown(Number(resp.data.resendAfterSec || 60)),
  });

  const errMsg =
    verifyMut.error?.response?.data?.error?.message ||
    resendMut.error?.response?.data?.error?.message ||
    verifyMut.error?.message ||
    resendMut.error?.message;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-start justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-md bg-base-100 p-6 sm:p-8 rounded-2xl shadow space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Verify email</h2>
          <p className="text-sm opacity-70 break-words">OTP đã gửi tới: {email}</p>
        </div>

        {errMsg && (
          <div className="alert alert-error">
            <span>{errMsg}</span>
          </div>
        )}

        <label className="form-control">
          <span className="label-text">OTP code (6 digits)</span>
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
          disabled={!canVerify || verifyMut.isPending}
          onClick={() => verifyMut.mutate()}
        >
          {verifyMut.isPending ? "Verifying..." : "Verify"}
        </button>

        <button
          className="btn btn-ghost w-full"
          disabled={cooldown > 0 || resendMut.isPending}
          onClick={() => resendMut.mutate()}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
        </button>
      </div>
    </div>
  );
}