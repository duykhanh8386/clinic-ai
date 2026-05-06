import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../utils/toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot, faPenToSquare, faFilePdf, faList, faCalendarDay } from "@fortawesome/free-solid-svg-icons";
import {
  getAppointment,
  listAppointments,
  updateAppointmentStatus,
} from "../../services/appointment.service";
import { getPrevisit } from "../../services/previsit.service";
import { getAppointmentNote, upsertAppointmentNote } from "../../services/appointmentNote.service";
import {
  appointmentStatusClass,
  appointmentStatusLabel,
  formatDateOnly,
  formatDateTime,
  formatCurrency,
  isDateInputValue,
} from "../../utils/booking";

function toDateInput(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function deferStateUpdate(callback) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }
  setTimeout(callback, 0);
}

function PrevisitBlock({ data }) {
  if (!data?.formData) {
    return <div className="text-sm opacity-70">Chưa có phiếu tiền khám.</div>;
  }

  const f = data.formData;

  return (
    <div className="space-y-3 text-sm">
      {/* AI Summary badge - hiển thị khi có */}
      {data.aiSummary && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
          <div className="flex items-center gap-1.5 font-semibold text-blue-700 mb-1">
            <FontAwesomeIcon icon={faRobot} className="text-blue-500" /> Tóm tắt AI
          </div>
          <p className="text-blue-900 leading-relaxed">{data.aiSummary}</p>
        </div>
      )}
      <div><span className="font-medium">Triệu chứng:</span> {(f.symptoms || []).join(", ") || "-"}</div>
      <div><span className="font-medium">Số ngày bị:</span> {f.durationDays ?? "-"}</div>
      <div><span className="font-medium">Sốt:</span> {f.fever ? "Có" : "Không"}</div>
      <div><span className="font-medium">Dị ứng:</span> {(f.allergies || []).join(", ") || "Không"}</div>
      <div><span className="font-medium">Tiền sử:</span> {(f.medicalHistory || []).join(", ") || "Không"}</div>
      <div><span className="font-medium">Thuốc đang dùng:</span> {(f.currentMedications || []).join(", ") || "Không"}</div>
      <div><span className="font-medium">Ghi chú:</span> {f.notes || "-"}</div>
    </div>
  );
}

function AppointmentCard({ appointment, selected, onClick }) {
  return (
    <button
      type="button"
      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-base-200 hover:border-base-300 hover:bg-base-50"
      }`}
      onClick={onClick}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">
            {appointment.patient?.fullName || appointment.patient?.email}
          </div>
          <div className="text-sm opacity-70">{appointment.service?.name || "-"}</div>
        </div>
        <span className={`badge ${appointmentStatusClass(appointment.status)}`}>
          {appointmentStatusLabel(appointment.status)}
        </span>
      </div>
      <div className="mt-2 text-sm opacity-80">{formatDateTime(appointment.slotStartAt)}</div>
    </button>
  );
}

export default function DoctorAppointments() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const fromParam = searchParams.get("from");
  const idParam = searchParams.get("id");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState("day"); // "all" | "day"
  const [selectedDate, setSelectedDate] = useState(() => {
    if (!fromParam) return toDateInput(new Date());
    return isDateInputValue(fromParam) ? fromParam : "";
  });
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

  // Sync from query params when clicking notification/schedule links.
  useEffect(() => {
    if (fromParam) {
      if (isDateInputValue(fromParam)) {
        deferStateUpdate(() => setSelectedDate(fromParam));
      } else {
        deferStateUpdate(() => setSelectedDate(""));
        toast.error("Ngày khám không hợp lệ. Vui lòng chọn lại ngày.");
      }
    }
    if (idParam) deferStateUpdate(() => setSelectedAppointmentId(idParam));

    // Backward-compatible for old notifications without ?from=...:
    // fetch appointment by id and jump date picker to the appointment date.
    if (!fromParam && idParam) {
      let cancelled = false;
      getAppointment(idParam)
        .then((res) => {
          if (cancelled) return;
          const slotStartAt = res?.data?.slotStartAt;
          if (slotStartAt) {
            setSelectedDate(toDateInput(new Date(slotStartAt)));
          }
        })
        .catch(() => {
          // ignore
        });
      return () => {
        cancelled = true;
      };
    }

    return undefined;
  }, [fromParam, idParam]);

  const appointmentsQ = useQuery({
    queryKey: ["doctor-appointments", filterStatus, viewMode === "day" ? selectedDate : "all"],
    queryFn: () =>
      listAppointments({
        page: 1,
        limit: 200,
        status: filterStatus || undefined,
        ...(viewMode === "day" && isDateInputValue(selectedDate)
          ? { from: selectedDate, to: selectedDate }
          : {}),
        sortBy: "slotStartAt",
        sortOrder: "asc",
      }),
    enabled: viewMode !== "day" || isDateInputValue(selectedDate),
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  const appointments = useMemo(() => appointmentsQ.data?.data ?? [], [appointmentsQ.data]);

  // Group appointments by date for "all" mode
  const appointmentsByDate = useMemo(() => {
    if (viewMode !== "all") return [];
    const map = new Map();
    for (const apt of appointments) {
      const dateKey = new Date(apt.slotStartAt).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey).push(apt);
    }
    return Array.from(map.entries()).map(([dateKey, items]) => ({ dateKey, items }));
  }, [appointments, viewMode]);

  const detailQ = useQuery({
    queryKey: ["doctor-appointment-detail", selectedAppointmentId],
    enabled: Boolean(selectedAppointmentId),
    queryFn: () => getAppointment(selectedAppointmentId),
  });

  const previsitQ = useQuery({
    queryKey: ["doctor-previsit", selectedAppointmentId],
    enabled: Boolean(selectedAppointmentId),
    queryFn: () => getPrevisit(selectedAppointmentId),
  });

  const noteQ = useQuery({
    queryKey: ["doctor-note", selectedAppointmentId],
    enabled: Boolean(selectedAppointmentId),
    queryFn: () => getAppointmentNote(selectedAppointmentId),
  });

  const selectedDetail = detailQ.data?.data;
  const selectedPrevisit = previsitQ.data?.data;
  const selectedNote = noteQ.data?.data;

  const [noteForm, setNoteForm] = useState({ diagnosis: "", prescriptionNotes: "", followUpDays: "", notes: "" });
  const [noteEditing, setNoteEditing] = useState(false);

  // Khi mở appointment khác thì reset note form
  const handleSelectAppointment = (id) => {
    setSelectedAppointmentId(id);
    setNoteEditing(false);
  };

  function printInvoice(detail, note) {
    if (!note || (!note.diagnosis && !note.prescriptionNotes && !note.notes)) {
      toast.error("Thông tin trong phiếu chưa đủ để in. Vui lòng điền ghi chú sau khám trước.");
      return;
    }
    const price = detail.priceSnapshot ?? detail.service?.price ?? null;
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;
    const doctorName = detail.doctor?.fullName || "-";
    const patientName = detail.patient?.fullName || detail.patient?.email || "-";
    const patientPhone = detail.patient?.phone || "-";
    const serviceName = detail.service?.name || "-";
    const slotTime = formatDateTime(detail.slotStartAt);
    const invoiceDate = new Date().toLocaleDateString("vi-VN");
    const invoiceId = detail.id.slice(-8).toUpperCase();
    const diagnosis = note?.diagnosis || "-";
    const prescription = note?.prescriptionNotes || "-";
    const followUp = note?.followUpDays ? `${note.followUpDays} ngày` : "-";
    const priceStr = price != null ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price) : "-";
    const qrUrl = `https://img.vietqr.io/image/MB-0359086356-compact2.png?${price != null ? `amount=${price}&` : ""}addInfo=Thanh%20toan%20HD%20${invoiceId}&accountName=PHONG%20KHAM%20DA%20KHOA%20DUY%20KHANH`;
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Hóa đơn khám - ${invoiceId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16a34a; padding-bottom: 16px; margin-bottom: 24px; }
  .clinic-name { font-size: 20px; font-weight: bold; color: #16a34a; }
  .clinic-sub { font-size: 12px; color: #555; margin-top: 4px; }
  .invoice-title { text-align: right; }
  .invoice-title h2 { font-size: 22px; font-weight: bold; color: #1a1a1a; }
  .invoice-title .inv-id { font-size: 13px; color: #555; margin-top: 4px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #16a34a; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .field label { font-size: 11px; color: #777; }
  .field p { font-size: 13px; font-weight: 500; margin-top: 2px; }
  .price-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
  .price-label { font-size: 14px; font-weight: 600; color: #15803d; }
  .price-value { font-size: 22px; font-weight: bold; color: #15803d; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-size: 12px; color: #555; }
  .sign-box { width: 180px; }
  .sign-box .sign-line { margin-top: 60px; border-top: 1px solid #555; padding-top: 4px; }
  .qr-section { margin-top: 16px; border: 1px solid #bfdbfe; border-radius: 8px; overflow: hidden; }
  .qr-header { background: #1a56db; color: #fff; font-weight: bold; font-size: 12px; padding: 8px 16px; letter-spacing: 0.05em; }
  .qr-body { display: flex; align-items: center; gap: 20px; padding: 16px; }
  .qr-img { width: 150px; border: 1px solid #e2e8f0; border-radius: 4px; }
  .qr-info p { font-size: 12px; margin-bottom: 5px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="clinic-name">Phòng Khám Đa Khoa AI</div>
      <div class="clinic-sub">Hệ thống quản lý khám chữa bệnh</div>
    </div>
    <div class="invoice-title">
      <h2>HÓA ĐƠN KHÁM</h2>
      <div class="inv-id">#${invoiceId} &nbsp;|&nbsp; ${invoiceDate}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Thông tin bệnh nhân</div>
    <div class="grid2">
      <div class="field"><label>Họ và tên</label><p>${patientName}</p></div>
      <div class="field"><label>Số điện thoại</label><p>${patientPhone}</p></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Thông tin ca khám</div>
    <div class="grid2">
      <div class="field"><label>Bác sĩ khám</label><p>BS. ${doctorName}</p></div>
      <div class="field"><label>Dịch vụ</label><p>${serviceName}</p></div>
      <div class="field"><label>Thời gian khám</label><p>${slotTime}</p></div>
      <div class="field"><label>Lý do khám</label><p>${detail.reason || "-"}</p></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Kết quả khám</div>
    <div class="grid2">
      <div class="field"><label>Chẩn đoán</label><p>${diagnosis}</p></div>
      <div class="field"><label>Tái khám sau</label><p>${followUp}</p></div>
    </div>
    <div class="field" style="margin-top:10px"><label>Hướng dẫn điều trị / Đơn thuốc</label><p>${prescription}</p></div>
  </div>
  <div class="price-box">
    <span class="price-label">ĐIỀU TRỊ PHÍ DỊCH VỤ</span>
    <span class="price-value">${priceStr}</span>
  </div>
  <div class="qr-section">
    <div class="qr-header">Thanh toán qua VNPay / VietQR</div>
    <div class="qr-body">
      <img src="${qrUrl}" class="qr-img" alt="VietQR" />
      <div class="qr-info">
        <p><strong>Ngân hàng:</strong> MB Bank</p>
        <p><strong>Số tài khoản:</strong> 0359086356</p>
        <p><strong>Chủ tài khoản:</strong> PHONG KHAM DA KHOA DUY KHANH</p>
        <p><strong>Số tiền:</strong> ${priceStr}</p>
        <p><strong>Nội dung CK:</strong> Thanh toan HD ${invoiceId}</p>
      </div>
    </div>
  </div>
  <div class="footer">
    <div class="sign-box">
      <div>Bệnh nhân ký tên</div>
      <div class="sign-line">${patientName}</div>
    </div>
    <div class="sign-box">
      <div>Bác sĩ điều trị</div>
      <div class="sign-line">BS. ${doctorName}</div>
    </div>
  </div>
</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  }

  const noteMutation = useMutation({
    mutationFn: (payload) => upsertAppointmentNote(selectedAppointmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-note", selectedAppointmentId] });
      setNoteEditing(false);
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || "Lưu ghi chú thất bại"),
  });

  function handleSaveNote(e) {
    e.preventDefault();
    const payload = {
      diagnosis: noteForm.diagnosis || undefined,
      prescriptionNotes: noteForm.prescriptionNotes || undefined,
      followUpDays: noteForm.followUpDays ? Number(noteForm.followUpDays) : undefined,
      notes: noteForm.notes || undefined,
    };
    noteMutation.mutate(payload);
  }

  function startEditNote() {
    setNoteForm({
      diagnosis: selectedNote?.diagnosis || "",
      prescriptionNotes: selectedNote?.prescriptionNotes || "",
      followUpDays: selectedNote?.followUpDays ?? "",
      notes: selectedNote?.notes || "",
    });
    setNoteEditing(true);
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateAppointmentStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-appointment-detail", selectedAppointmentId] });
      toast.success("Đã cập nhật trạng thái lịch hẹn.");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error?.message || "Không cập nhật được trạng thái.");
    },
  });

  const dateErrorMessage =
    viewMode === "day" && !isDateInputValue(selectedDate)
      ? "Vui lòng chọn ngày khám hợp lệ."
      : "";

  const appointmentsErrorMessage =
    appointmentsQ.error?.response?.data?.error?.message === "Invalid request query"
      ? "Bộ lọc ngày không hợp lệ. Vui lòng chọn lại ngày khám."
      : appointmentsQ.error?.response?.data?.error?.message ||
        "Không tải được danh sách lịch hẹn.";

  function handleDateChange(nextDate) {
    setSelectedDate(nextDate);
    setSelectedAppointmentId("");
    if (!isDateInputValue(nextDate)) {
      toast.error("Vui lòng chọn ngày khám hợp lệ.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">Quản lý lịch khám</h1>
            <p className="mt-1 text-sm opacity-70">
              Xem tất cả lịch hẹn hoặc lọc theo ngày cụ thể.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {/* View mode toggle */}
            <div className="join self-start">
              <button
                type="button"
                className={`join-item btn btn-sm gap-1.5 ${
                  viewMode === "all" ? "btn-primary" : "btn-ghost border border-base-300"
                }`}
                onClick={() => setViewMode("all")}
              >
                <FontAwesomeIcon icon={faList} />
                Tất cả
              </button>
              <button
                type="button"
                className={`join-item btn btn-sm gap-1.5 ${
                  viewMode === "day" ? "btn-primary" : "btn-ghost border border-base-300"
                }`}
                onClick={() => setViewMode("day")}
              >
                <FontAwesomeIcon icon={faCalendarDay} />
                Theo ngày
              </button>
            </div>
            {/* Date + status luôn cùng hàng, mỗi cái chiếm 1/2 */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className={`input input-bordered input-sm w-full ${viewMode === "all" ? "opacity-40 pointer-events-none" : ""}`}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={viewMode === "all"}
              />
              <select
                className="select select-bordered select-sm w-full"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xác nhận</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="DONE">Hoàn tất</option>
                <option value="CANCELED">Đã hủy</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        <div className="rounded-2xl border border-base-200 bg-base-100 p-4 sm:p-5">
          {viewMode === "day" && (
            <div className="mb-4 flex items-center gap-2 text-sm font-medium opacity-70">
              <FontAwesomeIcon icon={faCalendarDay} className="text-primary" />
              Ngày khám: {formatDateOnly(selectedDate)}
            </div>
          )}
          {viewMode === "all" && appointments.length > 0 && (
            <div className="mb-4 flex items-center gap-2 text-sm font-medium opacity-70">
              <FontAwesomeIcon icon={faList} className="text-primary" />
              {appointments.length} lịch hẹn
            </div>
          )}

          {dateErrorMessage ? (
            <div className="rounded-2xl border border-error/40 bg-error/5 p-4 text-sm text-error">
              {dateErrorMessage}
            </div>
          ) : appointmentsQ.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-base-200" />
              ))}
            </div>
          ) : appointmentsQ.isError ? (
            <div className="rounded-2xl border border-error/40 bg-error/5 p-4 text-sm text-error">
              {appointmentsErrorMessage}
            </div>
          ) : appointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70">
              {viewMode === "day" ? "Không có lịch hẹn nào trong ngày này." : "Không có lịch hẹn nào."}
            </div>
          ) : viewMode === "all" ? (
            // ── All mode: grouped by date ──
            <div className="space-y-5">
              {appointmentsByDate.map(({ dateKey, items }) => (
                <div key={dateKey}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      {new Date(dateKey + "T00:00:00").toLocaleDateString("vi-VN", {
                        weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
                      })}
                    </span>
                    <span className="text-xs opacity-50">{items.length} lịch</span>
                    <div className="flex-1 border-t border-dashed border-base-300" />
                  </div>
                  <div className="space-y-2">
                    {items.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        selected={selectedAppointmentId === appointment.id}
                        onClick={() => handleSelectAppointment(appointment.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // ── Day mode: flat list ──
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  selected={selectedAppointmentId === appointment.id}
                  onClick={() => handleSelectAppointment(appointment.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-base-200 bg-base-100 p-4 sm:p-5">
          {!selectedAppointmentId ? (
            <div className="text-sm opacity-70">Chọn 1 lịch bên trái để xem chi tiết.</div>
          ) : detailQ.isLoading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-base-200" />
          ) : !selectedDetail ? (
            <div className="text-sm text-error">Không tải được chi tiết lịch hẹn.</div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="text-lg font-semibold">Chi tiết lịch hẹn</div>
                <div className="mt-1 text-sm opacity-70">{formatDateTime(selectedDetail.slotStartAt)}</div>
              </div>

              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Bệnh nhân:</span> {selectedDetail.patient?.fullName || "-"}</div>
                <div><span className="font-medium">Email:</span> {selectedDetail.patient?.email || "-"}</div>
                <div><span className="font-medium">SĐT:</span> {selectedDetail.patient?.phone || "-"}</div>
                <div><span className="font-medium">Dịch vụ:</span> {selectedDetail.service?.name || "-"}</div>
                <div><span className="font-medium">Lý do khám:</span> {selectedDetail.reason || "-"}</div>
                {(selectedDetail.priceSnapshot != null || selectedDetail.service?.price != null) && (
                  <div className="flex items-center gap-2 pt-1 mt-1 border-t border-base-200">
                    <span className="font-medium">Phí dịch vụ:</span>
                    <span className="font-bold text-success">
                      {formatCurrency(selectedDetail.priceSnapshot ?? selectedDetail.service?.price)}
                    </span>
                    {selectedDetail.priceSnapshot != null && (
                      <span className="text-xs opacity-50">(tại thời điểm đặt)</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Phiếu tiền khám</div>
                {previsitQ.isLoading ? (
                  <div className="h-20 animate-pulse rounded-xl bg-base-200" />
                ) : (
                  <PrevisitBlock data={selectedPrevisit} />
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">Ghi chú sau khám (Bác sĩ)</div>
                  {["CONFIRMED", "DONE"].includes(selectedDetail.status) && !noteEditing && (
                    <button className="btn btn-ghost btn-xs" onClick={startEditNote}>
                      {selectedNote ? <><FontAwesomeIcon icon={faPenToSquare} className="mr-1" />Sửa</> : "+ Thêm ghi chú"}
                    </button>
                  )}
                </div>
                {noteEditing ? (
                  <form onSubmit={handleSaveNote} className="space-y-3">
                    <textarea
                      placeholder="Chẩn đoán..."
                      className="textarea textarea-bordered w-full text-sm"
                      rows={2}
                      value={noteForm.diagnosis}
                      onChange={(e) => setNoteForm((f) => ({ ...f, diagnosis: e.target.value }))}
                    />
                    <textarea
                      placeholder="Đơn thuốc / hướng dẫn điều trị..."
                      className="textarea textarea-bordered w-full text-sm"
                      rows={2}
                      value={noteForm.prescriptionNotes}
                      onChange={(e) => setNoteForm((f) => ({ ...f, prescriptionNotes: e.target.value }))}
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="Tái khám sau (ngày)"
                      className="input input-bordered w-full text-sm"
                      value={noteForm.followUpDays}
                      onChange={(e) => setNoteForm((f) => ({ ...f, followUpDays: e.target.value }))}
                    />
                    <textarea
                      placeholder="Ghi chú thêm..."
                      className="textarea textarea-bordered w-full text-sm"
                      rows={2}
                      value={noteForm.notes}
                      onChange={(e) => setNoteForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm" type="submit" disabled={noteMutation.isPending}>
                        {noteMutation.isPending ? "Đang lưu..." : "Lưu"}
                      </button>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setNoteEditing(false)}>
                        Hủy
                      </button>
                    </div>
                  </form>
                ) : selectedNote ? (
                  <div className="space-y-1 rounded-xl bg-base-200 p-3 text-sm">
                    {selectedNote.diagnosis && (
                      <div><span className="font-medium">Chẩn đoán:</span> {selectedNote.diagnosis}</div>
                    )}
                    {selectedNote.prescriptionNotes && (
                      <div><span className="font-medium">Đơn thuốc:</span> {selectedNote.prescriptionNotes}</div>
                    )}
                    {selectedNote.followUpDays && (
                      <div><span className="font-medium">Tái khám sau:</span> {selectedNote.followUpDays} ngày</div>
                    )}
                    {selectedNote.notes && (
                      <div><span className="font-medium">Ghi chú:</span> {selectedNote.notes}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm opacity-60">Chưa có ghi chú sau khám.</div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedDetail.status === "PENDING" && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      statusMutation.mutate({ id: selectedDetail.id, status: "CONFIRMED" })
                    }
                    disabled={statusMutation.isPending}
                  >
                    Xác nhận
                  </button>
                )}
                {selectedDetail.status === "CONFIRMED" && (() => {
                  const notStarted = new Date(selectedDetail.slotStartAt) > new Date();
                  const btn = (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() =>
                        statusMutation.mutate({ id: selectedDetail.id, status: "DONE" })
                      }
                      disabled={statusMutation.isPending || notStarted}
                    >
                      Hoàn tất
                    </button>
                  );
                  return notStarted ? (
                    <span
                      className="tooltip tooltip-top"
                      data-tip="Chưa đến giờ khám, không thể hoàn tất"
                    >
                      {btn}
                    </span>
                  ) : btn;
                })()}
                {! ["DONE", "CANCELED"].includes(selectedDetail.status) && (
                  <button
                    className="btn btn-error btn-outline btn-sm"
                    onClick={() =>
                      statusMutation.mutate({ id: selectedDetail.id, status: "CANCELED" })
                    }
                    disabled={statusMutation.isPending}
                  >
                    Hủy lịch
                  </button>
                )}
                {selectedDetail.status === "DONE" && (
                  <button
                    className="btn btn-sm gap-1.5"
                    style={{ background: "#ef4444", color: "white", border: "none" }}
                    onClick={() => printInvoice(selectedDetail, selectedNote)}
                  >
                    <FontAwesomeIcon icon={faFilePdf} />
                    Xuất hóa đơn PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
