import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../utils/toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays, faCalendarPlus, faStethoscope, faCircleCheck,
  faClock, faTimesCircle, faChevronDown, faChevronUp, faClockRotateLeft,
  faClipboardList, faNotesMedical, faFilter, faUserDoctor,
} from "@fortawesome/free-solid-svg-icons";
import {
  cancelAppointment,
  listAppointments,
  rescheduleAppointment,
} from "../../services/appointment.service";
import { getPrevisit, upsertPrevisit } from "../../services/previsit.service";
import { getAppointmentNote } from "../../services/appointmentNote.service";
import { listSlots } from "../../services/slot.service";
import { formatDateTime, formatCurrency } from "../../utils/booking";

function doctorCode(id) { return id ? id.slice(-8).toUpperCase() : ""; }

function emptyPrevisitForm() {
  return {
    symptoms: "",
    durationDays: "0",
    fever: false,
    allergies: "",
    medicalHistory: "",
    currentMedications: "",
    notes: "",
  };
}

function mapPrevisitForm(formData) {
  const form = formData || {};
  return {
    symptoms: (form.symptoms || []).join(", "),
    durationDays: String(form.durationDays ?? 0),
    fever: Boolean(form.fever),
    allergies: (form.allergies || []).join(", "),
    medicalHistory: (form.medicalHistory || []).join(", "),
    currentMedications: (form.currentMedications || []).join(", "),
    notes: form.notes || "",
  };
}

const STATUS_CONFIG = {
  PENDING:   { label: "Chờ xác nhận", bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-200",  dot: "bg-amber-400" },
  CONFIRMED: { label: "Đã xác nhận",  bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-200",   dot: "bg-blue-500" },
  DONE:      { label: "Hoàn tất",      bg: "bg-green-50",  text: "text-green-600",  border: "border-green-200",  dot: "bg-green-500" },
  CANCELED:  { label: "Đã hủy",        bg: "bg-gray-50",   text: "text-gray-400",   border: "border-gray-200",   dot: "bg-gray-300" },
};

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export default function PatientAppointments() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [expandedAppointmentId, setExpandedAppointmentId] = useState("");
  const highlightRef = useRef(null);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState("");
  const [previsitAppointmentId, setPrevisitAppointmentId] = useState("");
  const [noteAppointmentId, setNoteAppointmentId] = useState("");
  const [previsitForm, setPrevisitForm] = useState(emptyPrevisitForm);
  const [isPrevisitDirty, setIsPrevisitDirty] = useState(false);

  const appointmentsQ = useQuery({
    queryKey: ["patient-appointments", filterStatus],
    queryFn: () =>
      listAppointments({ page: 1, limit: 50, status: filterStatus || undefined }),
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });
  const appointments = useMemo(() => appointmentsQ.data?.data ?? [], [appointmentsQ.data]);

  function getSlotDateKey(isoStr) {
    return new Date(isoStr).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  }
  function getDaysInMonth(monthStr) {
    const [y, m] = monthStr.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }
  function handleMonthChange(month) { setFilterMonth(month); setFilterDay(""); }
  function handleDayChange(day) { setFilterDay(day); if (day) setFilterMonth(day.slice(0, 7)); }

  const availableMonths = useMemo(() => {
    const seen = new Map();
    for (const apt of appointments) {
      const key = getSlotDateKey(apt.slotStartAt).slice(0, 7);
      if (!seen.has(key)) {
        const d = new Date(apt.slotStartAt);
        const raw = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(d);
        seen.set(key, raw.charAt(0).toUpperCase() + raw.slice(1));
      }
    }
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    if (filterDay) return appointments.filter((apt) => getSlotDateKey(apt.slotStartAt) === filterDay);
    if (filterMonth) return appointments.filter((apt) => getSlotDateKey(apt.slotStartAt).slice(0, 7) === filterMonth);
    return appointments;
  }, [appointments, filterDay, filterMonth]);

  const dayHeaderLabel = useMemo(() => {
    if (!filterDay) return null;
    const [year, monthNum, day] = filterDay.split("-").map(Number);
    const d = new Date(year, monthNum - 1, day);
    const monthYear = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(d);
    return `Ngày ${day}, ${monthYear}`;
  }, [filterDay]);

  useEffect(() => {
    const idParam = searchParams.get("id");
    if (!idParam || appointments.length === 0) return;
    const t = setTimeout(() => {
      if (highlightRef.current) highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(t);
  }, [searchParams, appointments]);

  const groupedAppointments = useMemo(() => {
    const groups = [];
    const map = new Map();
    for (const apt of filteredAppointments) {
      const d = new Date(apt.slotStartAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map.has(key)) {
        const raw = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(d);
        const group = { monthKey: key, monthLabel: raw.charAt(0).toUpperCase() + raw.slice(1), items: [] };
        map.set(key, group);
        groups.push(group);
      }
      map.get(key).items.push(apt);
    }
    return groups;
  }, [filteredAppointments]);

  const expandedAppointment = useMemo(
    () => appointments.find((a) => a.id === expandedAppointmentId),
    [appointments, expandedAppointmentId]
  );

  const rescheduleSlotsQ = useQuery({
    queryKey: ["patient-reschedule-slots", expandedAppointment?.doctorId, expandedAppointment?.serviceId, expandedAppointment?.slotStartAt],
    enabled: Boolean(expandedAppointment),
    queryFn: () => listSlots({ doctorId: expandedAppointment.doctorId, serviceId: expandedAppointment.serviceId, date: expandedAppointment.slotStartAt.slice(0, 10) }),
  });
  const availableSlots = useMemo(() => rescheduleSlotsQ.data?.data ?? [], [rescheduleSlotsQ.data]);

  const noteQ = useQuery({
    queryKey: ["patient-note", noteAppointmentId],
    enabled: Boolean(noteAppointmentId),
    queryFn: () => getAppointmentNote(noteAppointmentId),
  });

  const previsitQ = useQuery({
    queryKey: ["patient-previsit", previsitAppointmentId],
    enabled: Boolean(previsitAppointmentId),
    queryFn: () => getPrevisit(previsitAppointmentId),
  });

  const serverPrevisitForm = useMemo(() => mapPrevisitForm(previsitQ.data?.data?.formData), [previsitQ.data]);
  const activePrevisitForm = isPrevisitDirty ? previsitForm : serverPrevisitForm;

  const previsitMutation = useMutation({
    mutationFn: ({ appointmentId, payload }) => upsertPrevisit(appointmentId, payload),
    onSuccess: () => {
      toast.success("Đã lưu phiếu tiền khám.");
      queryClient.invalidateQueries({ queryKey: ["patient-previsit", previsitAppointmentId] });
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
    onError: (error) => { toast.error(error?.response?.data?.error?.message || "Không lưu được phiếu tiền khám."); },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id }) => cancelAppointment(id, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["patient-appointments"] }); toast.success("Đã hủy lịch hẹn."); },
    onError: (error) => { toast.error(error?.response?.data?.error?.message || "Không thể hủy lịch."); },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, newSlotId }) => rescheduleAppointment(id, { newSlotId }),
    onSuccess: () => {
      setExpandedAppointmentId(""); setSelectedNewSlotId("");
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
      toast.success("Đổi lịch thành công.");
    },
    onError: (error) => { toast.error(error?.response?.data?.error?.message || "Không thể đổi lịch."); },
  });

  function toggleReschedule(appointmentId) {
    setSelectedNewSlotId("");
    setExpandedAppointmentId((cur) => (cur === appointmentId ? "" : appointmentId));
  }

  function togglePrevisit(appointmentId) {
    if (previsitAppointmentId === appointmentId) {
      setPrevisitAppointmentId(""); setPrevisitForm(emptyPrevisitForm()); setIsPrevisitDirty(false); return;
    }
    setPrevisitAppointmentId(appointmentId); setPrevisitForm(emptyPrevisitForm()); setIsPrevisitDirty(false);
  }

  function toArray(value) {
    return String(value || "").split(",").map((v) => v.trim()).filter(Boolean);
  }

  function updatePrevisitForm(key, value) {
    setPrevisitForm({ ...activePrevisitForm, [key]: value });
    setIsPrevisitDirty(true);
  }

  // Stats
  const stats = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "PENDING").length,
    confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
    done: appointments.filter((a) => a.status === "DONE").length,
  }), [appointments]);

  const STATUS_FILTERS = [
    { value: "", label: "Tất cả" },
    { value: "PENDING",   label: "Chờ xác nhận" },
    { value: "CONFIRMED", label: "Đã xác nhận" },
    { value: "DONE",      label: "Hoàn tất" },
    { value: "CANCELED",  label: "Đã hủy" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-latoV">

      {/* ── Hero header ── */}
      <div className="bg_main px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-3">
                <FontAwesomeIcon icon={faCalendarDays} className="text-white text-sm" />
                <span className="text-white font-medium text-sm">Quản lý lịch hẹn</span>
              </div>
              <h1 className="text-3xl font-bold text-white">Lịch hẹn của tôi</h1>
              <p className="mt-1 text-white/80 text-sm">Xem, hủy hoặc dời lịch khi cần thiết.</p>
            </div>
            <Link
              to="/booking"
              className="bg_button inline-flex items-center gap-2 px-6 py-3 font-bold text-sm whitespace-nowrap self-start sm:self-auto shadow-lg"
            >
              <FontAwesomeIcon icon={faCalendarPlus} />
              Đặt lịch mới
            </Link>
          </div>

          {/* Stats */}
          {appointments.length > 0 && (
            <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Tổng lịch hẹn", value: stats.total,     icon: faCalendarDays,   color: "text-white" },
                { label: "Chờ xác nhận",  value: stats.pending,   icon: faClock,          color: "text-amber-300" },
                { label: "Đã xác nhận",   value: stats.confirmed, icon: faCircleCheck,    color: "text-blue-200" },
                { label: "Hoàn tất",       value: stats.done,      icon: faStethoscope,    color: "text-green-300" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="bg-white/15 backdrop-blur rounded-2xl px-4 py-3 flex items-center gap-3">
                  <FontAwesomeIcon icon={icon} className={`text-xl ${color}`} />
                  <div>
                    <div className="text-white font-bold text-xl leading-none">{value}</div>
                    <div className="text-white/70 text-xs mt-0.5">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Filter bar ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium shrink-0">
              <FontAwesomeIcon icon={faFilter} className="text-xs" />
              Lọc theo:
            </div>
            {/* Status pills */}
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilterStatus(value)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    filterStatus === value
                      ? "bg_main text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Divider */}
            {availableMonths.length > 0 && <div className="w-px h-5 bg-gray-200 shrink-0" />}

            {/* Month/day filter */}
            {availableMonths.length > 0 && (
              <select
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-600 outline-none focus:border-green-400 bg-white cursor-pointer"
                value={filterMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
              >
                <option value="">Tất cả tháng</option>
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            )}

            {filterMonth && (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max={getDaysInMonth(filterMonth)}
                  placeholder="Ngày"
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-center outline-none focus:border-green-400 w-20"
                  value={filterDay ? parseInt(filterDay.split("-")[2]) : ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!raw) { setFilterDay(""); return; }
                    const day = parseInt(raw);
                    const max = getDaysInMonth(filterMonth);
                    if (day >= 1 && day <= max) handleDayChange(`${filterMonth}-${String(day).padStart(2, "0")}`);
                  }}
                />
                <span className="text-sm text-gray-400">/{filterMonth.slice(5, 7)}/{filterMonth.slice(0, 4)}</span>
              </div>
            )}

            {(filterMonth || filterDay) && (
              <button
                className="text-sm text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                onClick={() => { setFilterMonth(""); setFilterDay(""); }}
              >
                <FontAwesomeIcon icon={faTimesCircle} />
                Xóa lọc
              </button>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        {appointmentsQ.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📅</div>
            <p className="font-semibold text-gray-600 text-lg">Bạn chưa có lịch hẹn nào</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Hãy đặt lịch để được thăm khám bởi các bác sĩ chuyên khoa</p>
            <Link to="/booking" className="bg_button inline-flex items-center gap-2 px-6 py-3 font-bold text-sm shadow">
              <FontAwesomeIcon icon={faCalendarPlus} />
              Đặt lịch ngay
            </Link>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold text-gray-500">Không có lịch hẹn nào phù hợp bộ lọc</p>
            <button
              className="mt-3 text-sm text-green-600 underline"
              onClick={() => { setFilterStatus(""); setFilterMonth(""); setFilterDay(""); }}
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {groupedAppointments.map(({ monthKey, monthLabel, items }) => (
              <div key={monthKey}>
                {/* Month/day header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 shadow-sm">
                    <FontAwesomeIcon icon={faCalendarDays} className="text-green-500 text-sm" />
                    <span className="text-sm font-bold text-gray-700">
                      {filterDay ? dayHeaderLabel : monthLabel}
                    </span>
                    <span className="ml-1 bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="space-y-4">
                  {items.map((appointment) => {
                    const isHighlighted = searchParams.get("id") === appointment.id;
                    const isDone = appointment.status === "DONE";
                    const isCanceled = appointment.status === "CANCELED";
                    const isActive = !isDone && !isCanceled;
                    const sc = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.PENDING;

                    const startDate = new Date(appointment.slotStartAt);
                    const dayNum = startDate.toLocaleDateString("vi-VN", { day: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
                    const weekday = startDate.toLocaleDateString("vi-VN", { weekday: "short", timeZone: "Asia/Ho_Chi_Minh" });
                    const monthStr = startDate.toLocaleDateString("vi-VN", { month: "short", timeZone: "Asia/Ho_Chi_Minh" });
                    const timeStr = startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
                    const endTimeStr = new Date(appointment.slotEndAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

                    return (
                      <div
                        key={appointment.id}
                        ref={isHighlighted ? highlightRef : null}
                        className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all duration-200 ${
                          isHighlighted ? "border-green-400 shadow-md shadow-green-100" : "border-gray-100 hover:shadow-md"
                        } ${isCanceled ? "opacity-60" : ""}`}
                      >
                        {/* Status top bar */}
                        <div className={`h-1 ${sc.dot.replace("bg-", "bg-")}`} style={{ background: appointment.status === "PENDING" ? "#f59e0b" : appointment.status === "CONFIRMED" ? "#3b82f6" : appointment.status === "DONE" ? "#22c55e" : "#d1d5db" }} />

                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            {/* Date block */}
                            <div className={`shrink-0 rounded-2xl px-3 py-2 text-center min-w-[60px] ${sc.bg} border ${sc.border}`}>
                              <div className={`text-xs font-medium ${sc.text} uppercase`}>{weekday}</div>
                              <div className={`text-2xl font-bold leading-none mt-0.5 ${sc.text}`}>{dayNum}</div>
                              <div className={`text-xs font-medium ${sc.text} mt-0.5`}>{monthStr}</div>
                            </div>

                            {/* Main info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={faUserDoctor} className="text-gray-400 text-sm" />
                                    <span className="font-bold text-gray-800 text-base">
                                      Bác sĩ {appointment.doctor?.fullName || "—"}
                                    </span>
                                    {appointment.doctor?.id && (
                                      <span className="text-xs text-gray-400 font-mono">#{doctorCode(appointment.doctor.id)}</span>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                                    <FontAwesomeIcon icon={faStethoscope} className="text-xs text-gray-400" />
                                    {appointment.service?.name || "—"}
                                  </div>
                                </div>
                                <StatusBadge status={appointment.status} />
                              </div>

                              {/* Time & reason */}
                              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-1.5 text-gray-600">
                                  <FontAwesomeIcon icon={faClock} className="text-green-400 text-xs" />
                                  <span className="font-semibold">{timeStr}</span>
                                  <span className="text-gray-400">–</span>
                                  <span>{endTimeStr}</span>
                                </div>
                                {(() => {
                                  const price = appointment.priceSnapshot ?? appointment.service?.price;
                                  return price != null ? (
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="font-bold text-orange-500">{formatCurrency(price)}</span>
                                    </div>
                                  ) : null;
                                })()}
                                {appointment.reason && (
                                  <div className="flex items-center gap-1.5 text-gray-500 min-w-0">
                                    <FontAwesomeIcon icon={faClipboardList} className="text-xs text-gray-400 shrink-0" />
                                    <span className="truncate">{appointment.reason}</span>
                                  </div>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="mt-4 flex flex-wrap gap-2">
                                {isActive && (
                                  <button
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                                    onClick={() => cancelMutation.mutate({ id: appointment.id })}
                                    disabled={cancelMutation.isPending}
                                  >
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    Hủy lịch
                                  </button>
                                )}
                                {isActive && (
                                  <button
                                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border transition-colors ${
                                      expandedAppointmentId === appointment.id
                                        ? "border-blue-400 text-blue-600 bg-blue-50"
                                        : "border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100"
                                    }`}
                                    onClick={() => toggleReschedule(appointment.id)}
                                  >
                                    <FontAwesomeIcon icon={faClockRotateLeft} />
                                    {expandedAppointmentId === appointment.id ? "Đóng" : "Đổi lịch"}
                                    <FontAwesomeIcon icon={expandedAppointmentId === appointment.id ? faChevronUp : faChevronDown} className="text-[10px]" />
                                  </button>
                                )}
                                <button
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border transition-colors ${
                                    previsitAppointmentId === appointment.id
                                      ? "border-purple-400 text-purple-600 bg-purple-50"
                                      : "border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100"
                                  }`}
                                  onClick={() => togglePrevisit(appointment.id)}
                                >
                                  <FontAwesomeIcon icon={faClipboardList} />
                                  Phiếu tiền khám
                                  <FontAwesomeIcon icon={previsitAppointmentId === appointment.id ? faChevronUp : faChevronDown} className="text-[10px]" />
                                </button>
                                {isDone && (
                                  <button
                                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border transition-colors ${
                                      noteAppointmentId === appointment.id
                                        ? "border-green-400 text-green-600 bg-green-50"
                                        : "border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100"
                                    }`}
                                    onClick={() => setNoteAppointmentId((cur) => (cur === appointment.id ? "" : appointment.id))}
                                  >
                                    <FontAwesomeIcon icon={faNotesMedical} />
                                    Kết quả khám
                                    <FontAwesomeIcon icon={noteAppointmentId === appointment.id ? faChevronUp : faChevronDown} className="text-[10px]" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ── Reschedule panel ── */}
                          {expandedAppointmentId === appointment.id && (
                            <div className="mt-5 pt-5 border-t border-gray-100">
                              <div className="flex items-center gap-2 mb-3">
                                <FontAwesomeIcon icon={faClockRotateLeft} className="text-blue-500 text-sm" />
                                <span className="text-sm font-bold text-gray-700">Chọn khung giờ mới</span>
                              </div>
                              {rescheduleSlotsQ.isLoading ? (
                                <div className="text-sm text-gray-400 py-3">Đang tải...</div>
                              ) : (() => {
                                const futureSlots = availableSlots.filter(
                                  (slot) => slot.id !== appointment.slotId && new Date(slot.startAt) > new Date()
                                );
                                return futureSlots.length === 0 ? (
                                  <div className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">
                                    Không có slot khả dụng trong tương lai.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {futureSlots.map((slot) => {
                                      const sSel = selectedNewSlotId === slot.id;
                                      const sTime = new Date(slot.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                                      const eTime = new Date(slot.endAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                                      return (
                                        <button
                                          key={slot.id}
                                          type="button"
                                          onClick={() => setSelectedNewSlotId(slot.id)}
                                          className={`rounded-xl border-2 p-3 text-center transition-all ${
                                            sSel
                                              ? "border-blue-400 bg-blue-50 scale-[1.02]"
                                              : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                                          }`}
                                        >
                                          <div className={`text-base font-bold ${sSel ? "text-blue-600" : "text-gray-700"}`}>{sTime}</div>
                                          <div className="text-xs text-gray-400">đến {eTime}</div>
                                          {sSel && <div className="mt-1 text-xs text-blue-600 font-semibold">Đã chọn ✓</div>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                              <div className="mt-4 flex justify-end">
                                <button
                                  className="bg_button text-white text-sm font-bold px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={!selectedNewSlotId || rescheduleMutation.isPending}
                                  onClick={() => rescheduleMutation.mutate({ id: appointment.id, newSlotId: selectedNewSlotId })}
                                >
                                  {rescheduleMutation.isPending ? "Đang đổi..." : "✓ Xác nhận đổi lịch"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ── Note panel ── */}
                          {noteAppointmentId === appointment.id && (
                            <div className="mt-5 pt-5 border-t border-gray-100">
                              <div className="flex items-center gap-2 mb-3">
                                <FontAwesomeIcon icon={faNotesMedical} className="text-green-500 text-sm" />
                                <span className="text-sm font-bold text-gray-700">Kết quả khám (Bác sĩ ghi)</span>
                              </div>
                              {noteQ.isLoading ? (
                                <div className="text-sm text-gray-400 py-2">Đang tải...</div>
                              ) : noteQ.data?.data ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {[
                                    { label: "Chẩn đoán", value: noteQ.data.data.diagnosis },
                                    { label: "Đơn thuốc", value: noteQ.data.data.prescriptionNotes },
                                    { label: "Tái khám sau", value: noteQ.data.data.followUpDays ? `${noteQ.data.data.followUpDays} ngày` : null },
                                    { label: "Ghi chú", value: noteQ.data.data.notes },
                                  ].filter((f) => f.value).map(({ label, value }) => (
                                    <div key={label} className="bg-green-50 border border-green-100 rounded-xl p-3">
                                      <p className="text-xs font-semibold text-green-600 mb-1">{label}</p>
                                      <p className="text-sm text-gray-700">{value}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">
                                  Bác sĩ chưa cập nhật kết quả khám.
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── Previsit panel ── */}
                          {previsitAppointmentId === appointment.id && (
                            <div className="mt-5 pt-5 border-t border-gray-100">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <FontAwesomeIcon icon={faClipboardList} className="text-purple-500 text-sm" />
                                  <span className="text-sm font-bold text-gray-700">Phiếu tiền khám</span>
                                </div>
                                {previsitQ.isLoading && <span className="text-xs text-gray-400">Đang tải...</span>}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Triệu chứng (phân tách bằng dấu phẩy)</label>
                                  <input
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                                    placeholder="Ví dụ: đau họng, ho khan..."
                                    value={activePrevisitForm.symptoms}
                                    onChange={(e) => updatePrevisitForm("symptoms", e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Số ngày bị bệnh</label>
                                  <input
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                                    type="number" min="0" max="365"
                                    value={activePrevisitForm.durationDays}
                                    onChange={(e) => updatePrevisitForm("durationDays", e.target.value)}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <label className="flex items-center gap-2.5 border border-gray-200 rounded-xl px-3 py-2.5 w-full cursor-pointer hover:border-purple-300 transition-colors">
                                    <input
                                      type="checkbox"
                                      className="checkbox checkbox-sm checkbox-primary"
                                      checked={activePrevisitForm.fever}
                                      onChange={(e) => updatePrevisitForm("fever", e.target.checked)}
                                    />
                                    <span className="text-sm text-gray-700 font-medium">Có sốt</span>
                                  </label>
                                </div>
                                {[
                                  { key: "allergies", label: "Dị ứng" },
                                  { key: "medicalHistory", label: "Tiền sử bệnh" },
                                  { key: "currentMedications", label: "Thuốc đang dùng" },
                                ].map(({ key, label }) => (
                                  <div key={key}>
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                                    <input
                                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                                      placeholder={`${label}...`}
                                      value={activePrevisitForm[key]}
                                      onChange={(e) => updatePrevisitForm(key, e.target.value)}
                                    />
                                  </div>
                                ))}
                                <div className="sm:col-span-2">
                                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Ghi chú thêm</label>
                                  <textarea
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all min-h-20 resize-none"
                                    placeholder="Thông tin bổ sung..."
                                    value={activePrevisitForm.notes}
                                    onChange={(e) => updatePrevisitForm("notes", e.target.value)}
                                  />
                                </div>
                              </div>

                              <div className="mt-4 flex justify-end">
                                <button
                                  className="bg_button text-white text-sm font-bold px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={previsitMutation.isPending}
                                  onClick={() => {
                                    const symptoms = toArray(activePrevisitForm.symptoms);
                                    if (symptoms.length === 0) {
                                      toast.error("Vui lòng điền ít nhất 1 triệu chứng để lưu phiếu tiền khám.");
                                      return;
                                    }
                                    previsitMutation.mutate({
                                      appointmentId: appointment.id,
                                      payload: {
                                        formData: {
                                          symptoms,
                                          durationDays: Number(activePrevisitForm.durationDays || 0),
                                          fever: Boolean(activePrevisitForm.fever),
                                          allergies: toArray(activePrevisitForm.allergies),
                                          medicalHistory: toArray(activePrevisitForm.medicalHistory),
                                          currentMedications: toArray(activePrevisitForm.currentMedications),
                                          notes: activePrevisitForm.notes,
                                        },
                                      },
                                    });
                                  }}
                                >
                                  {previsitMutation.isPending ? "Đang lưu..." : "💾 Lưu phiếu"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

