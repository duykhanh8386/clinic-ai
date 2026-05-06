import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getMe, updateMe } from "../../services/auth.service";
import { confirmEmailOtp, requestEmailOtp } from "../../services/otp.service";
import { useBootAuth } from "../../context/useBootAuth";
import { toast } from "../../utils/toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelopeCircleCheck, faPenToSquare } from "@fortawesome/free-solid-svg-icons";

function onlyDigits6(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 6);
}

export default function PatientProfile() {
  const { me, setMe } = useBootAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: me?.fullName || "", phone: me?.phone || "" });
  const [error, setError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const emailVerified = Boolean(me?.emailVerifiedAt);

  useEffect(() => {
    setForm({ fullName: me?.fullName || "", phone: me?.phone || "" });
  }, [me?.fullName, me?.phone]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: async () => {
      const fresh = await getMe();
      setMe(fresh.data);
      setEditing(false);
      setError("");
      toast.success("Đã cập nhật hồ sơ.");
    },
    onError: (err) => {
      setError(err?.response?.data?.error?.message || "Cập nhật thất bại");
    },
  });

  const requestOtpMut = useMutation({
    mutationFn: requestEmailOtp,
    onSuccess: () => {
      setOtpSent(true);
      setVerifyError("");
      setCooldown(60);
      toast.success("Đã gửi mã OTP đến email của bạn.");
    },
    onError: (err) => {
      setVerifyError(err?.response?.data?.error?.message || "Không thể gửi OTP.");
    },
  });

  const confirmOtpMut = useMutation({
    mutationFn: () => confirmEmailOtp(otpCode),
    onSuccess: async () => {
      const fresh = await getMe();
      setMe(fresh.data);
      setOtpCode("");
      setOtpSent(false);
      setVerifyError("");
      toast.success("Email đã được xác thực.");
    },
    onError: (err) => {
      setVerifyError(err?.response?.data?.error?.message || "Mã OTP không hợp lệ.");
    },
  });

  function handleSave(e) {
    e.preventDefault();
    setError("");
    const payload = {};
    if (form.fullName.trim() && form.fullName.trim() !== me?.fullName) {
      payload.fullName = form.fullName.trim();
    }
    if (form.phone.trim() && form.phone.trim() !== me?.phone) {
      payload.phone = form.phone.trim();
    }
    if (!Object.keys(payload).length) {
      setEditing(false);
      return;
    }
    mutation.mutate(payload);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Hồ sơ cá nhân</h1>
      </div>

      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6 space-y-4">
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-medium opacity-60 uppercase tracking-wide">Họ tên</label>
              <input
                className="input input-bordered w-full mt-1"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Họ và tên"
              />
            </div>
            <div>
              <label className="text-xs font-medium opacity-60 uppercase tracking-wide">Số điện thoại</label>
              <input
                className="input input-bordered w-full mt-1"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="0912345678"
              />
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            <div className="flex gap-3">
              <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium opacity-60 uppercase tracking-wide">Email</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <span>{me?.email || "-"}</span>
                  <span className={`badge badge-xs ${emailVerified ? "badge-success" : "badge-warning"}`}>
                    {emailVerified ? "Đã xác thực" : "Chưa xác thực"}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium opacity-60 uppercase tracking-wide">Họ tên</div>
                <div className="mt-1 text-sm">{me?.fullName || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-medium opacity-60 uppercase tracking-wide">Số điện thoại</div>
                <div className="mt-1 text-sm">{me?.phone || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-medium opacity-60 uppercase tracking-wide">Vai trò</div>
                <div className="mt-1 text-sm capitalize">{me?.role?.toLowerCase() || "-"}</div>
              </div>
            </div>
            <button className="btn btn-outline btn-sm mt-2" onClick={() => setEditing(true)}>
              <FontAwesomeIcon icon={faPenToSquare} className="mr-1.5" />Chỉnh sửa
            </button>
          </>
        )}
      </div>

      {!emailVerified && (
        <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <FontAwesomeIcon icon={faEnvelopeCircleCheck} className="text-primary" />
                Xác thực email
              </h2>
              <p className="mt-1 text-sm opacity-70">
                Xác thực email để tài khoản có thể dùng chức năng quên mật khẩu.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={requestOtpMut.isPending || cooldown > 0}
              onClick={() => requestOtpMut.mutate()}
            >
              {requestOtpMut.isPending
                ? "Đang gửi..."
                : cooldown > 0
                ? `Gửi lại sau ${cooldown}s`
                : otpSent
                ? "Gửi lại OTP"
                : "Gửi OTP"}
            </button>
          </div>

          {otpSent && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className="input input-bordered w-full text-center text-lg tracking-[0.4em]"
                value={otpCode}
                onChange={(e) => setOtpCode(onlyDigits6(e.target.value))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="______"
              />
              <button
                type="button"
                className="btn btn-success"
                disabled={otpCode.length !== 6 || confirmOtpMut.isPending}
                onClick={() => confirmOtpMut.mutate()}
              >
                {confirmOtpMut.isPending ? "Đang xác thực..." : "Xác thực"}
              </button>
            </div>
          )}

          {verifyError && <p className="mt-3 text-sm text-error">{verifyError}</p>}
        </div>
      )}
    </div>
  );
}
