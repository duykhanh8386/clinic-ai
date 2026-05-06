import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faTriangleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";
import { api } from "../../services/api";
import { listSlotsByRange } from "../../services/slot.service";
import { listSpecialties } from "../../services/specialty.service";
import { addDaysInputValue, formatDateTime } from "../../utils/booking";
import { CLINIC_SPECIALTIES } from "../../constants/specialties";

function doctorCode(id) { return id ? id.slice(-8).toUpperCase() : ""; }

function toDateKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDateRange(from, to) {
  if (!from || !to) return [];
  const dates = [];
  const cur = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cur <= end) {
    dates.push(toDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ISO week helpers
function getISOWeekInfo(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7),
    year: d.getUTCFullYear(),
  };
}

function getWeekBounds(weekStr) {
  if (!weekStr) return { from: "", to: "" };
  const [yearStr, weekPart] = weekStr.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const w1Mon = new Date(jan4);
  w1Mon.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const mon = new Date(w1Mon);
  mon.setUTCDate(w1Mon.getUTCDate() + (week - 1) * 7);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return {
    from: mon.toISOString().slice(0, 10),
    to: sun.toISOString().slice(0, 10),
  };
}

function dateToWeekValue(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  const { week, year } = getISOWeekInfo(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getOffsetWeekValue(offsetWeeks = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetWeeks * 7);
  const { week, year } = getISOWeekInfo(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// ── Schedule grid helpers ─────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }
function timeToMin(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function addWeeks(weekStr, n) {
  const { from } = getWeekBounds(weekStr);
  const d = new Date(`${from}T00:00:00`);
  d.setDate(d.getDate() + n * 7);
  const { week, year } = getISOWeekInfo(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
const SCHEDULE_HOURS = Array.from({ length: 10 }, (_, i) => i + 8);
const DOW_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DISPLAY_DOW = [1, 2, 3, 4, 5, 6, 0];

// Convert Set<"dow-hour"> → [{dayOfWeek, startTime, endTime}] merging consecutive hours
function cellsToRules(cells) {
  const byDay = {};
  for (const key of cells) {
    const [dow, hour] = key.split("-").map(Number);
    if (!byDay[dow]) byDay[dow] = [];
    byDay[dow].push(hour);
  }
  const rules = [];
  for (const [dow, hours] of Object.entries(byDay)) {
    hours.sort((a, b) => a - b);
    let start = hours[0], prev = hours[0];
    for (let i = 1; i <= hours.length; i++) {
      if (i === hours.length || hours[i] !== prev + 1) {
        rules.push({ dayOfWeek: Number(dow), startTime: `${pad(start)}:00`, endTime: `${pad(prev + 1)}:00` });
        if (i < hours.length) { start = hours[i]; prev = hours[i]; }
      } else { prev = hours[i]; }
    }
  }
  return rules;
}

export default function AdminSlots() {
  const [params] = useSearchParams();
  const preselectedDoctorId = params.get("doctorId") || "";

  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [specialtiesData, setSpecialtiesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedDoctorId, setSelectedDoctorId] = useState(preselectedDoctorId);

  // Slot generator
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [scheduleWeekValue, setScheduleWeekValue] = useState(() => {
    try {
      return localStorage.getItem("adminSlotsScheduleWeek") || getOffsetWeekValue(1);
    } catch {
      return getOffsetWeekValue(1);
    }
  });
  const scheduleWeekBounds = useMemo(() => getWeekBounds(scheduleWeekValue), [scheduleWeekValue]);
  // Derive column dates (Mon–Sun) for the viewed week
  const scheduleColDates = useMemo(() => {
    const { from } = scheduleWeekBounds;
    if (!from) return [];
    return DISPLAY_DOW.map((_, i) => {
      const d = new Date(`${from}T00:00:00`);
      d.setDate(d.getDate() + i);
      return toDateKey(d);
    });
  }, [scheduleWeekBounds]);
  const [generateFrom, setGenerateFrom] = useState(() => getWeekBounds(getOffsetWeekValue(1)).from);
  const [generateTo, setGenerateTo] = useState(() => getWeekBounds(getOffsetWeekValue(1)).to);
  const [generateServiceId, setGenerateServiceId] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [generateResult, setGenerateResult] = useState(null);

  // Slots overlaid on the schedule grid (all services, for the viewed week)
  const [scheduleSlots, setScheduleSlots] = useState([]);

  // For showing slots when clicking on a cell with generated slots
  const [selectedCellInfo, setSelectedCellInfo] = useState(null); // { dow, hour, dateStr }
  const [selectedCellSlots, setSelectedCellSlots] = useState([]);

  // dow-hour → { available: n, booked: n }
  const scheduleSlotMap = useMemo(() => {
    const map = {};
    for (const slot of scheduleSlots) {
      const dateKey = toDateKey(slot.startAt);
      const colIndex = scheduleColDates.indexOf(dateKey);
      if (colIndex === -1) continue;
      const dow = DISPLAY_DOW[colIndex];
      const hour = new Date(slot.startAt).getHours();
      const key = `${dow}-${hour}`;
      if (!map[key]) map[key] = { available: 0, booked: 0, serviceName: slot.service?.name || "" };
      if (slot.status === "BOOKED") map[key].booked++;
      else map[key].available++;
    }
    return map;
  }, [scheduleSlots, scheduleColDates]);

  const [slots, setSlots] = useState([]);
  const [slotViewWeek, setSlotViewWeek] = useState(() => {
    try {
      return localStorage.getItem("adminSlotsViewWeek") || getOffsetWeekValue(0);
    } catch {
      return getOffsetWeekValue(0);
    }
  });
  const slotViewFrom = useMemo(() => getWeekBounds(slotViewWeek).from, [slotViewWeek]);
  const slotViewTo   = useMemo(() => getWeekBounds(slotViewWeek).to,   [slotViewWeek]);
  const [slotViewServiceId, setSlotViewServiceId] = useState("");
  const [currentSlotDate, setCurrentSlotDate] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [showDoctorList, setShowDoctorList] = useState(false);

  const specialties = useMemo(() => {
    const names = specialtiesData.map((item) => item.name).filter(Boolean);
    return names.length ? names : CLINIC_SPECIALTIES;
  }, [specialtiesData]);

  const displayedServices = useMemo(() => {
    if (!specialtyFilter) return services;
    return services.filter((service) => (service.specialty || "").trim() === specialtyFilter);
  }, [services, specialtyFilter]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId),
    [doctors, selectedDoctorId]
  );

  const filteredDoctors = useMemo(() => {
    let list = doctors;
    if (specialtyFilter) {
      list = list.filter((d) => (d.specialty || "").trim() === specialtyFilter);
    }
    if (serviceFilter) list = list.filter((d) => (d.services || []).some((s) => s.id === serviceFilter));
    if (doctorSearch.trim()) {
      const q = doctorSearch.toLowerCase();
      list = list.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          (d.specialty || "").toLowerCase().includes(q) ||
          doctorCode(d.id).toLowerCase().includes(q.replace("#", ""))
      );
    }
    return list;
  }, [doctors, serviceFilter, doctorSearch, specialtyFilter]);

  // Điền tên bác sĩ vào ô tìm kiếm khi selection được resolve (VD: từ URL param)
  useEffect(() => {
    if (selectedDoctor) {
      setDoctorSearch(`${selectedDoctor.fullName} (${selectedDoctor.specialty || "?"}`);
    }
  }, [selectedDoctor?.id]);

  useEffect(() => {
    (async () => {
      try {
        const [svcRes, docRes, specialtyRes] = await Promise.all([
          api.get("/services", { params: { page: 1, limit: 50 } }),
          api.get("/doctors", { params: { page: 1, limit: 50, includeInactive: true } }),
          listSpecialties({ page: 1, limit: 100 }),
        ]);
        setServices(svcRes.data?.data || []);
        setDoctors(docRes.data?.data || []);
        setSpecialtiesData(specialtyRes.data || []);
      } catch (e) {
        setError(e?.response?.data?.error?.message || e?.message || "Không tải được dữ liệu.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedDoctor) {
      setSlotViewServiceId("");
      setGenerateResult(null);
      setSlots([]);
      setScheduleSlots([]);
      setGenerateServiceId("");
      setSelectedCells(new Set());
      return;
    }
    const firstId = (selectedDoctor.services || [])[0]?.id || "";
    setGenerateServiceId(firstId);
    setSlotViewServiceId(firstId);
    setGenerateResult(null);
  }, [selectedDoctor?.id]);


  const slotDatePages = useMemo(() => buildDateRange(slotViewFrom, slotViewTo), [slotViewFrom, slotViewTo]);
  const slotsByDate = useMemo(() => {
    return slots.reduce((acc, slot) => {
      const key = toDateKey(slot.startAt);
      if (!acc[key]) acc[key] = [];
      acc[key].push(slot);
      return acc;
    }, {});
  }, [slots]);

  const currentSlotIndex = useMemo(() => {
    if (!currentSlotDate) return 0;
    const idx = slotDatePages.indexOf(currentSlotDate);
    return idx >= 0 ? idx : 0;
  }, [slotDatePages, currentSlotDate]);

  const activeSlotDate = slotDatePages[currentSlotIndex] || "";
  const activeSlots = slotsByDate[activeSlotDate] || [];

  useEffect(() => {
    try {
      localStorage.setItem("adminSlotsScheduleWeek", scheduleWeekValue);
    } catch {
      // ignore localStorage errors
    }
  }, [scheduleWeekValue]);

  useEffect(() => {
    try {
      localStorage.setItem("adminSlotsViewWeek", slotViewWeek);
    } catch {
      // ignore localStorage errors
    }
  }, [slotViewWeek]);

  useEffect(() => {
    const pages = buildDateRange(slotViewFrom, slotViewTo);
    setCurrentSlotDate(pages[0] || "");
  }, [slotViewFrom, slotViewTo]);

  async function fetchScheduleSlots(doctorId, from, to) {
    if (!doctorId || !from || !to) { setScheduleSlots([]); return; }
    try {
      const res = await listSlotsByRange({ doctorId, from, to, includeInactive: true });
      setScheduleSlots(Array.isArray(res?.data) ? res.data : []);
    } catch { setScheduleSlots([]); }
  }

  async function fetchSlots(doctorId, from, to, serviceId) {
    if (!doctorId || !from || !to) { setSlots([]); setCurrentSlotDate(""); return; }
    try {
      const res = await listSlotsByRange({
        doctorId,
        ...(serviceId ? { serviceId } : {}),
        from,
        to,
        includeInactive: true,
      });
      const data = Array.isArray(res?.data) ? res.data : [];
      setSlots(data);
      const pages = buildDateRange(from, to);
      setCurrentSlotDate((cur) => (cur && pages.includes(cur) ? cur : pages[0] || ""));
    } catch (e) {
      console.error("Không tải được slot:", e);
      setSlots([]);
    }
  }

  useEffect(() => {
    if (!selectedDoctorId || !slotViewFrom || !slotViewTo) { setSlots([]); return; }
    fetchSlots(selectedDoctorId, slotViewFrom, slotViewTo, slotViewServiceId);
  }, [selectedDoctorId, slotViewServiceId, slotViewFrom, slotViewTo]);

  // Refresh grid overlay whenever the schedule week or doctor changes
  useEffect(() => {
    if (!selectedDoctorId || !scheduleWeekBounds.from) { setScheduleSlots([]); return; }
    fetchScheduleSlots(selectedDoctorId, scheduleWeekBounds.from, scheduleWeekBounds.to);
  }, [selectedDoctorId, scheduleWeekBounds.from]);

  function toggleCell(dow, hour) {
    const key = `${dow}-${hour}`;
    const existing = scheduleSlotMap[key];
    // Block toggling cells that already have a booked appointment
    if (existing?.booked > 0) return;
    setSelectedCells((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleCellClick(dow, hour, hasSlot, isBooked, active) {
    // If it's a cell with generated slots (emerald) that's not booked, show the slots
    if (hasSlot && !isBooked && !active) {
      const colIndex = DISPLAY_DOW.indexOf(dow);
      const dateStr = scheduleColDates[colIndex];
      
      // Filter slots for this specific dow and hour
      const slotsForCell = scheduleSlots.filter((slot) => {
        const slotDateKey = toDateKey(slot.startAt);
        if (slotDateKey !== dateStr) return false;
        const slotHour = new Date(slot.startAt).getHours();
        return slotHour === hour;
      });

      setSelectedCellInfo({ dow, hour, dateStr });
      setSelectedCellSlots(slotsForCell);
    } else if (!isBooked) {
      // Otherwise, use the original toggle behavior
      toggleCell(dow, hour);
    }
  }

  async function handleGenerateSlots() {
    if (!selectedDoctorId || !generateServiceId || selectedCells.size === 0 || !generateFrom || !generateTo) return;
    setSubmitting(true); setGenerateError(""); setGenerateResult(null);
    try {
      const rules = cellsToRules(selectedCells);
      const res = await api.post("/slots/generate-direct", {
        doctorId: selectedDoctorId,
        serviceId: generateServiceId,
        fromDate: generateFrom,
        toDate: generateTo,
        rules,
      });
      const { created = 0, skipped = 0, requested = 0, conflicts = [] } = res?.data?.data ?? {};
      setGenerateResult({ created, skipped, requested, conflicts, serviceId: generateServiceId });
      setSlotViewServiceId(generateServiceId);
      await Promise.all([
        fetchSlots(selectedDoctorId, slotViewFrom, slotViewTo, generateServiceId),
        fetchScheduleSlots(selectedDoctorId, scheduleWeekBounds.from, scheduleWeekBounds.to),
      ]);
    } catch (e) {
      setGenerateError(e?.response?.data?.error?.message || e?.message || "Không thể sinh slot.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Lịch làm việc &amp; Sinh slot</h1>
        <p className="mt-1 text-sm opacity-70">
          Chọn bác sĩ, click ô giờ trên lịch rồi sinh slot theo dịch vụ.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Doctor search combobox */}
      <div className="rounded-3xl bg-base-100 p-3 shadow sm:p-6">
        <label className="text-sm font-medium">Chọn bác sĩ</label>

        <div className="mt-3 flex flex-wrap gap-2">
          <select
            className="select select-bordered select-sm w-52"
            value={specialtyFilter}
            onChange={(e) => {
              setSpecialtyFilter(e.target.value);
              setServiceFilter("");
              setSelectedDoctorId("");
              setDoctorSearch("");
            }}
          >
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>{specialty}</option>
            ))}
          </select>

          {/* Service filter */}
          <select
            className="select select-bordered select-sm w-56"
            value={serviceFilter}
            onChange={(e) => {
              const nextServiceId = e.target.value;
              const nextService = services.find((service) => service.id === nextServiceId);
              setServiceFilter(nextServiceId);
              if (nextServiceId && nextService?.specialty) {
                setSpecialtyFilter(nextService.specialty.trim());
              }
              setSelectedDoctorId("");
              setDoctorSearch("");
            }}
          >
            <option value="">Tất cả dịch vụ</option>
            {displayedServices.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Name / code search */}
          <div className="relative flex-1 min-w-48">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-40">
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </span>
            <input
              type="text"
              className="input input-bordered input-sm w-full pl-9 pr-9"
              placeholder="Tìm tên, mã bác sĩ..."
              value={doctorSearch}
              onChange={(e) => {
                setDoctorSearch(e.target.value);
                if (selectedDoctorId) setSelectedDoctorId("");
                setShowDoctorList(true);
              }}
              onFocus={() => setShowDoctorList(true)}
              onBlur={() => setTimeout(() => setShowDoctorList(false), 150)}
            />
            {(doctorSearch || selectedDoctorId) && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSelectedDoctorId("");
                  setDoctorSearch("");
                  setShowDoctorList(false);
                }}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>
        </div>

        <div className="relative mt-2">
          {showDoctorList && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-base-200 bg-base-100 shadow-lg">
              {loading ? (
                <li className="px-4 py-3 text-sm opacity-60">Đang tải...</li>
              ) : filteredDoctors.length === 0 ? (
                <li className="px-4 py-3 text-sm opacity-60">Không tìm thấy bác sĩ.</li>
              ) : (
                filteredDoctors.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className={`w-full px-4 py-3 text-left transition hover:bg-base-200 ${
                        selectedDoctorId === d.id ? "bg-primary/10" : ""
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedDoctorId(d.id);
                        setDoctorSearch(`${d.fullName} (${d.specialty || "?"}`);
                        setShowDoctorList(false);
                      }}
                    >
                      <div className="text-sm font-medium">{d.fullName}</div>
                      <div className="text-xs opacity-60">
                        #{doctorCode(d.id)} · {d.specialty || "Chưa có chuyên khoa"}
                        {d.isActive === false && (
                          <span className="ml-2 text-error">(Tạm ngừng)</span>
                        )}
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {selectedDoctor && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary/10 sm:px-3 px-1 py-2 text-sm">
            <span className="font-medium text-[13px]">{selectedDoctor.fullName}</span>
        
            <span className="text-[11px] opacity-60">#{doctorCode(selectedDoctor.id)}</span>
            
            <span className="opacity-70 text-[13px]">{selectedDoctor.specialty}</span>
            <span
              className={`ml-auto badge badge-sm ${
                selectedDoctor.isActive !== false ? "badge-success" : "badge-error"
              }`}
            >
              {selectedDoctor.isActive !== false ? "Hoạt động" : "Tạm ngừng"}
            </span>
          </div>
        )}
      </div>

      {selectedDoctor ? (
        <div className="space-y-6">
          {/* Doctor info */}
          <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
            <div className="text-xl font-semibold">{selectedDoctor.fullName}</div>
            <div className="text-xs opacity-50 mt-0.5">#{doctorCode(selectedDoctor.id)} · {selectedDoctor.specialty}</div>
            {(selectedDoctor.services || []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(selectedDoctor.services || []).map((s) => (
                  <span key={s.id} className="badge badge-outline badge-sm">{s.name}</span>
                ))}
              </div>
            )}
          </div>

          {/* 1. Chọn ca làm việc – week-navigable grid */}
          <section className="rounded-3xl bg-base-100 p-5 shadow sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">1. Chọn ca làm việc</h3>
              {selectedCells.size > 0 && (
                <button className="btn btn-xs btn-ghost" onClick={() => setSelectedCells(new Set())}>
                  Xóa chọn ({selectedCells.size} ô)
                </button>
              )}
            </div>
            <p className="text-xs opacity-60">Điều hướng đến tuần cần sinh slot, click ô để chọn/bỏ chọn giờ làm việc.</p>

            {/* Week navigation */}
            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost btn-sm p-0"
                onClick={() => {
                  const w = addWeeks(scheduleWeekValue, -1);
                  setScheduleWeekValue(w);
                  const b = getWeekBounds(w);
                  setGenerateFrom(b.from);
                  setGenerateTo(b.to);
                }}
              >← Tuần trước</button>
              <input
                type="week"
                className="input input-bordered input-sm flex-1 min-w-0"
                value={scheduleWeekValue}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setScheduleWeekValue(e.target.value);
                  const b = getWeekBounds(e.target.value);
                  setGenerateFrom(b.from);
                  setGenerateTo(b.to);
                }}
              />
              <button
                className="btn btn-ghost btn-sm p-0"
                onClick={() => {
                  const w = addWeeks(scheduleWeekValue, 1);
                  setScheduleWeekValue(w);
                  const b = getWeekBounds(w);
                  setGenerateFrom(b.from);
                  setGenerateTo(b.to);
                }}
              >Tuần sau →</button>
              
            </div>
            <div className="flex justify-between items-end">
              <div className="text-xs opacity-40">{scheduleWeekBounds.from} — {scheduleWeekBounds.to}</div>
            <button
                className="btn btn-outline btn-xs"
                onClick={() => {
                  const w = getOffsetWeekValue(0);
                  setScheduleWeekValue(w);
                  const b = getWeekBounds(w);
                  setGenerateFrom(b.from);
                  setGenerateTo(b.to);
                }}
              >Tuần này</button></div>
                
            <div className="overflow-x-auto">
              <div style={{ minWidth: "480px" }}>
                {/* Header row with actual dates */}
                <div className="grid mb-1" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                  <div />
                  {DISPLAY_DOW.map((dow, i) => (
                    <div key={dow} className="text-center py-1 select-none">
                      <div className="text-xs font-semibold opacity-70">{DOW_LABELS[dow]}</div>
                      <div className="text-xs opacity-40">{scheduleColDates[i]?.slice(5)}</div>
                    </div>
                  ))}
                </div>
                {/* Hour rows */}
                {SCHEDULE_HOURS.map((hour) => (
                  <div key={hour} className="grid mb-px" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                    <div className="flex items-center justify-end pr-3 text-xs opacity-40 select-none">
                      {pad(hour)}:00
                    </div>
                    {DISPLAY_DOW.map((dow) => {
                      const key = `${dow}-${hour}`;
                      const active = selectedCells.has(key);
                      const existing = scheduleSlotMap[key];
                      const isBooked = existing?.booked > 0;
                      const hasSlot = !!(existing?.available > 0 || existing?.booked > 0);
                      const colDate = scheduleColDates[DISPLAY_DOW.indexOf(dow)]?.slice(5);
                      let cellCls, tipSuffix;
                      if (isBooked) {
                        cellCls = "bg-amber-400 border-amber-500 cursor-not-allowed";
                        tipSuffix = ` — đã được đặt (${existing.booked} lịch)`;
                      } else if (active) {
                        cellCls = "bg-sky-500 border-sky-600 cursor-pointer";
                        tipSuffix = hasSlot ? " — đã có slot (chọn lại để bỏ)" : " — đã chọn";
                      } else if (hasSlot) {
                        cellCls = "bg-emerald-400 border-emerald-500 cursor-pointer hover:bg-emerald-500";
                        tipSuffix = ` — đã sinh slot (${existing.available} available)`;
                      } else {
                        cellCls = "bg-base-200 border-base-300 cursor-pointer hover:bg-base-300";
                        tipSuffix = "";
                      }
                      return (
                        <div
                          key={dow}
                          onClick={() => handleCellClick(dow, hour, hasSlot, isBooked, active)}
                          className={`h-8 border rounded-sm mx-px transition-colors select-none ${cellCls}`}
                          title={`${DOW_LABELS[dow]} ${colDate} ${pad(hour)}:00–${pad(hour + 1)}:00${tipSuffix}`}
                        />
                      );
                    })}
                  </div>
                ))}
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs opacity-60">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-sm border border-sky-600 bg-sky-500" />Đang chọn
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-sm border border-emerald-500 bg-emerald-400" />Đã sinh slot
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-sm border border-amber-500 bg-amber-400" />Đã được đặt
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-sm border border-base-300 bg-base-200" />Trống
                  </span>
                </div>
              </div>
            </div>

            {/* Show slots for selected cell */}
            {selectedCellInfo && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm">
                    Slot đã sinh: {DOW_LABELS[selectedCellInfo.dow]} {selectedCellInfo.dateStr} {pad(selectedCellInfo.hour)}:00–{pad(selectedCellInfo.hour + 1)}:00
                  </h4>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => {
                      setSelectedCellInfo(null);
                      setSelectedCellSlots([]);
                    }}
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
                
                {selectedCellSlots.length === 0 ? (
                  <div className="text-sm opacity-60 py-2">Không có slot nào cho khoảng thời gian này.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {selectedCellSlots.map((slot) => (
                      <div key={slot.id} className="rounded-xl border border-emerald-200 bg-white p-3">
                        <div className="font-medium text-sm">{formatDateTime(slot.startAt)}</div>
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
          </section>

          {/* 2. Sinh slot */}
          <section className="rounded-3xl bg-base-100 p-5 shadow sm:p-6 space-y-4">
            <h3 className="text-base font-semibold">2. Sinh slot</h3>

            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-50">
                <label className="label label-text text-xs">Dịch vụ</label>
                <select
                  className="select select-bordered w-full"
                  value={generateServiceId}
                  onChange={(e) => setGenerateServiceId(e.target.value)}
                >
                  <option value="">Chọn dịch vụ</option>
                  {(selectedDoctor.services || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-base-300 bg-base-200/60 px-4 py-2 text-sm">
                <span className="opacity-50 mr-2">Tuần:</span>
                <span className="font-medium">{scheduleWeekBounds.from}</span>
                <span className="opacity-40 mx-1">→</span>
                <span className="font-medium">{scheduleWeekBounds.to}</span>
                <span className="ml-2 text-xs opacity-40">(auto từ lịch trên)</span>
              </div>
            </div>

            {selectedCells.size > 0 && generateServiceId && (
              <div className="text-sm opacity-70">
                {selectedCells.size} ô đã chọn → {cellsToRules(selectedCells).length} ca/ngày ·
                dịch vụ: <span className="font-medium">{(selectedDoctor.services || []).find(s => s.id === generateServiceId)?.name}</span>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleGenerateSlots}
              disabled={submitting || !generateServiceId || selectedCells.size === 0 || !generateFrom || !generateTo}
            >
              {submitting ? "Đang sinh slot…" : "Sinh slot"}
            </button>

            {generateResult && (
              <div className={`rounded-2xl border p-4 ${generateResult.skipped > 0 ? "border-warning bg-warning/10" : "border-success bg-success/10"}`}>
                <div className="font-semibold">
                  {generateResult.created > 0
                    ? `Đã sinh ${generateResult.created}/${generateResult.requested} slot mới.`
                    : `Không có slot nào được tạo mới (0/${generateResult.requested}).`}
                </div>
                {generateResult.skipped > 0 && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="opacity-80">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1 text-warning" />
                      <strong>{generateResult.skipped} slot bị bỏ qua</strong> vì đã tồn tại hoặc bị chiếm:
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-warning/40 bg-base-100">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-warning/20 text-left opacity-60">
                            <th className="px-3 py-2">Thời gian</th>
                            <th className="px-3 py-2">Dịch vụ đang chiếm</th>
                          </tr>
                        </thead>
                        <tbody>
                          {generateResult.conflicts.length > 0
                            ? generateResult.conflicts.map((c, i) => (
                                <tr key={i} className="border-b border-base-200 last:border-0">
                                  <td className="px-3 py-2 font-medium">{new Date(c.startAt).toLocaleString("vi-VN")}</td>
                                  <td className="px-3 py-2 opacity-80">{c.serviceName}</td>
                                </tr>
                              ))
                            : Array.from({ length: Math.min(generateResult.skipped, 5) }).map((_, i) => (
                                <tr key={i} className="border-b border-base-200 last:border-0">
                                  <td className="px-3 py-2 opacity-50" colSpan={2}>(slot đã tồn tại)</td>
                                </tr>
                              ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {generateError && (
              <div className="rounded-2xl border border-error bg-error/10 p-4 text-sm text-error">
                <FontAwesomeIcon icon={faXmark} className="mr-1.5" />{generateError}
              </div>
            )}
          </section>

          {/* 3. Slot đã sinh */}
          <section className="rounded-3xl bg-base-100 p-5 shadow sm:p-6 space-y-4">
            <h3 className="text-base font-semibold">3. Slot đã sinh</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <input
                  type="week"
                  className="input input-bordered w-full"
                  value={slotViewWeek}
                  onChange={(e) => setSlotViewWeek(e.target.value)}
                />
                {slotViewWeek && (
                  <div className="mt-1 pl-1 text-xs opacity-60">
                    Thứ 2 {slotViewFrom} → Chủ nhật {slotViewTo}
                  </div>
                )}
              </div>
              <select
                className="select select-bordered w-full"
                value={slotViewServiceId}
                onChange={(e) => setSlotViewServiceId(e.target.value)}
              >
                <option value="">Tất cả dịch vụ</option>
                {(selectedDoctor.services || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {!slotViewFrom || !slotViewTo ? (
              <div className="rounded-2xl border border-dashed border-base-300 p-4 text-sm opacity-70">
                Vui lòng chọn khoảng ngày từ - đến.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm opacity-70">
                    Tuần {slotViewWeek.replace("-W", " / tuần ")}: từ{" "}
                    <span className="font-medium">{slotViewFrom}</span> —{" "}
                    <span className="font-medium">{slotViewTo}</span>
                    {slotViewServiceId
                      ? ` — ${(selectedDoctor.services || []).find((s) => s.id === slotViewServiceId)?.name || ""}`
                      : " — Tất cả dịch vụ"}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setCurrentSlotDate(slotDatePages[currentSlotIndex - 1])}
                      disabled={currentSlotIndex <= 0}
                    >
                      ← Ngày trước
                    </button>
                    <div className="rounded-xl border border-base-200 px-4 py-2 text-sm font-medium">
                      {activeSlotDate || "Chưa có ngày"}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setCurrentSlotDate(slotDatePages[currentSlotIndex + 1])}
                      disabled={currentSlotIndex >= slotDatePages.length - 1}
                    >
                      Ngày sau →
                    </button>
                  </div>
                </div>

                <div className="text-xs opacity-60">
                  Trang ngày {slotDatePages.length ? currentSlotIndex + 1 : 0}/{slotDatePages.length}
                </div>

                {slotDatePages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-base-300 p-4 text-sm opacity-70">
                    Chưa có khoảng ngày hợp lệ.
                  </div>
                ) : activeSlots.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-base-300 p-4 text-sm opacity-70">
                    Hôm nay không có lịch.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {activeSlots.map((slot) => (
                      <div key={slot.id} className="rounded-2xl border border-base-200 p-4">
                        <div className="font-semibold">{formatDateTime(slot.startAt)}</div>
                        <div className="mt-1 text-sm opacity-70">
                          Dịch vụ: {slot.service?.name || "-"}
                        </div>
                        <div className="mt-1 text-sm opacity-70">
                          Bác sĩ: {slot.doctor?.fullName || selectedDoctor?.fullName || "-"}
                        </div>
                        <div className="mt-1 text-sm opacity-70">
                          Trạng thái: {slot.status || "AVAILABLE"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      ) : (
        !loading && (
          <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70">
            Chọn một bác sĩ ở trên để bắt đầu cấu hình.
          </div>
        )
      )}
    </div>
  );
}
