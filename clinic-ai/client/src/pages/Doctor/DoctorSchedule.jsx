import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useBootAuth } from "../../context/useBootAuth";
import { api } from "../../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeekBounds(weekStr) {
  const [yearStr, wStr] = weekStr.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  const jan4 = new Date(year, 0, 4);
  const startOfW1 = new Date(jan4);
  startOfW1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const monday = new Date(startOfW1);
  monday.setDate(startOfW1.getDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${dy}`;
  };
  return { start: fmt(monday), end: fmt(sunday) };
}

function getCurrentWeekValue() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const year = d.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const w1Mon = new Date(jan4);
  w1Mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const week = Math.round((d - w1Mon) / (7 * 86400000)) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function addWeeks(weekStr, n) {
  const { start } = getWeekBounds(weekStr);
  const d = new Date(start);
  d.setDate(d.getDate() + n * 7);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const year = d.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const w1Mon = new Date(jan4);
  w1Mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const week = Math.round((d - w1Mon) / (7 * 86400000)) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function pad(n) { return String(n).padStart(2, "0"); }
function timeToMin(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 08:00–17:00 (giờ hành chính)
const DOW_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DISPLAY_DOW = [1, 2, 3, 4, 5, 6, 0];

// ─── Component ────────────────────────────────────────────────────────────────
export default function DoctorSchedule() {
  const { me } = useBootAuth();
  const doctorProfileId = me?.doctorProfile?.id;
  const navigate = useNavigate();
  const [weekValue, setWeekValue] = useState(() => {
    try {
      return localStorage.getItem("doctorScheduleWeekValue") || getCurrentWeekValue();
    } catch {
      return getCurrentWeekValue();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("doctorScheduleWeekValue", weekValue);
    } catch {
      // ignore localStorage errors
    }
  }, [weekValue]);

  const weekBounds = useMemo(() => getWeekBounds(weekValue), [weekValue]);

  // Fetch slots for the viewed week (all services) to derive working hours
  const slotsQ = useQuery({
    queryKey: ["doctor-schedule-slots", doctorProfileId, weekBounds.start, weekBounds.end],
    enabled: Boolean(doctorProfileId),
    queryFn: () =>
      api
        .get("/slots/range", {
          params: { doctorId: doctorProfileId, from: weekBounds.start, to: weekBounds.end },
        })
        .then((r) => r.data?.data || []),
  });

  // Fetch confirmed/pending appointments for the current week
  const appointmentsQ = useQuery({
    queryKey: ["doctor-schedule-appts", doctorProfileId, weekBounds.start, weekBounds.end],
    enabled: Boolean(doctorProfileId),
    queryFn: () =>
      api
        .get("/appointments", {
          params: {
            from: weekBounds.start,
            to: weekBounds.end,
            limit: 200,
            sortBy: "slotStartAt",
            sortOrder: "asc",
          },
        })
        .then((r) => r.data.data || []),
  });

  // Map: "YYYY-MM-DD HH" → count of active appointments
  const apptMap = useMemo(() => {
    const map = {};
    (appointmentsQ.data || []).forEach((appt) => {
      if (appt.status === "CANCELED") return;
      const startAt = new Date(appt.slotStartAt);
      // Mark every hour slot this appointment overlaps
      const endAt = new Date(appt.slotEndAt);
      let cur = new Date(startAt);
      cur.setMinutes(0, 0, 0);
      while (cur < endAt) {
        const key = `${cur.toISOString().slice(0, 10)}_${cur.getHours()}`;
        map[key] = (map[key] || 0) + 1;
        cur.setHours(cur.getHours() + 1);
      }
    });
    return map;
  }, [appointmentsQ.data]);

  // Map: "YYYY-MM-DD" → count of active appointments (for per-day summary)
  const apptDayMap = useMemo(() => {
    const map = {};
    (appointmentsQ.data || []).forEach((appt) => {
      if (appt.status === "CANCELED") return;
      const date = new Date(appt.slotStartAt).toISOString().slice(0, 10);
      map[date] = (map[date] || 0) + 1;
    });
    return map;
  }, [appointmentsQ.data]);

  // Build Set<"dow-hour"> from slots so we know which cells have slots
  const slotHourSet = useMemo(() => {
    const set = new Set();
    (slotsQ.data || []).forEach((slot) => {
      const d = new Date(slot.startAt);
      const dow = d.getDay(); // 0=Sun
      const hour = d.getHours();
      set.add(`${dow}-${hour}`);
    });
    return set;
  }, [slotsQ.data]);

  // Per-day ordered time ranges derived from slots (for the summary cards)
  const daySlotRanges = useMemo(() => {
    const map = {};
    DISPLAY_DOW.forEach((dow) => { map[dow] = new Set(); });
    (slotsQ.data || []).forEach((slot) => {
      const d = new Date(slot.startAt);
      const dow = d.getDay();
      const h = d.getHours();
      map[dow]?.add(h);
    });
    const result = {};
    DISPLAY_DOW.forEach((dow) => {
      const hours = [...map[dow]].sort((a, b) => a - b);
      const ranges = [];
      let start = null, prev = null;
      hours.forEach((h) => {
        if (start === null) { start = h; prev = h; }
        else if (h === prev + 1) { prev = h; }
        else { ranges.push({ start: `${pad(start)}:00`, end: `${pad(prev + 1)}:00` }); start = h; prev = h; }
      });
      if (start !== null) ranges.push({ start: `${pad(start)}:00`, end: `${pad(prev + 1)}:00` });
      result[dow] = ranges;
    });
    return result;
  }, [slotsQ.data]);

  function isShiftHour(dow, hour) {
    return slotHourSet.has(`${dow}-${hour}`);
  }

  // Track selected cell for showing slots
  const [selectedCellInfo, setSelectedCellInfo] = useState(null); // { dow, hour, dateStr }

  function handleCellClick(dow, hour, dateStr) {
    // Toggle showing slots for this cell
    if (selectedCellInfo?.dow === dow && selectedCellInfo?.hour === hour && selectedCellInfo?.dateStr === dateStr) {
      setSelectedCellInfo(null);
    } else {
      setSelectedCellInfo({ dow, hour, dateStr });
    }
  }

  const colDates = useMemo(() => {
    const { start } = weekBounds;
    const base = new Date(start + "T00:00:00");
    return DISPLAY_DOW.map((dow) => {
      const d = new Date(base);
      d.setDate(base.getDate() + (dow === 0 ? 6 : dow - 1));
      // Use local date to avoid UTC offset shifting the date back by 1 day
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const dy = String(d.getDate()).padStart(2, "0");
      return `${y}-${mo}-${dy}`;
    });
  }, [weekBounds]);

  const selectedCellSlots = useMemo(() => {
    if (!selectedCellInfo || !slotsQ.data) return [];
    return slotsQ.data.filter((slot) => {
      const d = new Date(slot.startAt);
      const dow = d.getDay();
      const hour = d.getHours();
      const dateStr = colDates[DISPLAY_DOW.indexOf(dow)] || "";
      return dow === selectedCellInfo.dow && hour === selectedCellInfo.hour && dateStr === selectedCellInfo.dateStr;
    });
  }, [selectedCellInfo, slotsQ.data, colDates]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Lịch làm việc</h1>
        <p className="mt-1 text-sm opacity-70">
          Lịch làm việc theo tuần dựa trên ca đã được admin cấu hình.
        </p>
      </div>

      {/* Week navigation */}
      <div className="rounded-3xl bg-base-100 p-2 pt-4 shadow sm:p-6 space-y-4">
        {/* Row 1: ← Tuần trước | week picker | Tuần sau → */}
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekValue(addWeeks(weekValue, -1))}>
            ← Tuần trước
          </button>
          <input
            type="week"
            className="input input-bordered input-sm flex-1 min-w-0"
            value={weekValue}
            onChange={(e) => e.target.value && setWeekValue(e.target.value)}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekValue(addWeeks(weekValue, 1))}>
            Tuần sau →
          </button>
        </div>
        {/* Row 2: range ngày | nút Hôm nay */}
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-60 flex-1">{weekBounds.start} — {weekBounds.end}</span>
          <button className="btn btn-outline btn-xs" onClick={() => setWeekValue(getCurrentWeekValue())}>
            Hôm nay
          </button>
        </div>

        {/* Slot count chip */}
        {!slotsQ.isLoading && (
          <div className="flex flex-wrap gap-2">
            {(slotsQ.data || []).length === 0 ? (
              <span className="text-sm opacity-40">Tuần này chưa có slot nào.</span>
            ) : (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                {(slotsQ.data || []).length} slot trong tuần
                ({(slotsQ.data || []).filter(s => s.status === "AVAILABLE").length} trống,{" "}
                {(slotsQ.data || []).filter(s => s.status === "BOOKED").length} đã đặt)
              </span>
            )}
          </div>
        )}

        {/* Weekly grid */}
        {slotsQ.isLoading ? (
          <div className="h-80 animate-pulse rounded-2xl bg-base-200" />
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: "560px" }}>
              {/* Header row */}
              <div className="grid mb-1" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                <div />
                {DISPLAY_DOW.map((dow, i) => (
                  <div key={dow} className="text-center py-2 select-none">
                    <div className={`text-sm font-semibold ${(daySlotRanges[dow] || []).length > 0 ? "text-sky-600" : "text-base-content/40"}`}>
                      {DOW_LABELS[dow]}
                    </div>
                    <div className="text-xs opacity-50">{colDates[i].slice(5)}</div>
                  </div>
                ))}
              </div>

              {/* Hour rows */}
              {HOURS.map((hour) => (
                <div key={hour} className="grid mb-px" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                  <div className="flex items-center justify-end pr-3 text-xs opacity-40 select-none">
                    {pad(hour)}:00
                  </div>
                  {DISPLAY_DOW.map((dow, colIdx) => {
                    const active = isShiftHour(dow, hour);
                    const dateStr = colDates[colIdx];
                    const apptKey = `${dateStr}_${hour}`;
                    const hasAppt = active && Boolean(apptMap[apptKey]);

                    if (!active) {
                      return (
                        <div
                          key={dow}
                          className="h-8 border rounded-sm mx-px bg-base-100 border-base-200"
                        />
                      );
                    }

                    return (
                      <div
                        key={dow}
                        className={`h-8 border rounded-sm mx-px flex items-center px-1 overflow-hidden select-none
                          ${hasAppt
                            ? "bg-green-300 border-green-500 cursor-pointer hover:bg-sky-400 transition-colors"
                            : "bg-sky-100 border-sky-400 cursor-pointer hover:bg-sky-200 transition-colors"
                          }`}
                        title={hasAppt
                          ? `${apptMap[apptKey]} lịch hẹn — nhấn để xem`
                          : (daySlotRanges[dow] || []).map((s) => `${s.start}–${s.end}`).join(", ")}
                        onClick={hasAppt ? () => navigate(`/dashboard/doctor/appointments?from=${dateStr}&to=${dateStr}`) : () => handleCellClick(dow, hour, dateStr)}
                      >
                        {hasAppt && (
                          <span className="text-[10px] font-semibold text-sky-900 truncate leading-none">
                            {apptMap[apptKey]} lịch hẹn
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Legend */}
              <div className="mt-3 flex items-center gap-5 text-xs opacity-60">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm border border-sky-400 bg-sky-100" />
                  Có ca làm việc
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm border border-green-500 bg-green-300" />
                  Có lịch hẹn
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm border border-base-300 bg-base-200" />
                  Không làm
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Per-day shift summary */}
        {(slotsQ.data || []).length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 pt-2">
            {DISPLAY_DOW.map((dow, colIdx) => {
              const ranges = daySlotRanges[dow] || [];
              const dateStr = colDates[colIdx];
              const dayApptCount = apptDayMap[dateStr] || 0;
              return (
                <div key={dow} className="rounded-xl border border-base-200 p-3">
                  <div className={`flex items-center gap-1 text-xs font-semibold mb-1.5 ${ranges.length > 0 ? "text-sky-600" : "opacity-40"}`}>
                    {DOW_LABELS[dow]}
                    {dayApptCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                        {dayApptCount}
                      </span>
                    )}
                  </div>
                  {ranges.length === 0 ? (
                    <span className="text-xs opacity-30">Nghỉ</span>
                  ) : (
                    ranges.map((r, idx) => (
                      <div key={idx} className="rounded-lg bg-sky-50 px-2 py-1 text-xs text-sky-700 mb-1">
                        {r.start} – {r.end}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Show slots for selected cell */}
        {selectedCellInfo && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-sm">
                Slot: {DOW_LABELS[selectedCellInfo.dow]} {selectedCellInfo.dateStr} {pad(selectedCellInfo.hour)}:00–{pad(selectedCellInfo.hour + 1)}:00
              </h4>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setSelectedCellInfo(null)}
              >
                ✕
              </button>
            </div>
            
            {selectedCellSlots.length === 0 ? (
              <div className="text-sm opacity-60 py-2">Không có slot nào cho khoảng thời gian này.</div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {selectedCellSlots.map((slot) => (
                  <div key={slot.id} className="rounded-xl border border-sky-200 bg-white p-3">
                    <div className="font-medium text-sm">{new Date(slot.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="mt-1 text-xs opacity-70">
                      Dịch vụ: {slot.service?.name || "-"}
                    </div>
                    <div className="mt-1 text-xs opacity-70">
                      Trạng thái: <span className={slot.status === "BOOKED" ? "text-error" : "text-success"}>{slot.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


