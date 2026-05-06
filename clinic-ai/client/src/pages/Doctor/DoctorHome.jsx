import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAppointments } from "../../services/appointment.service";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const STATUS_COLOR = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  DONE: "#10b981",
  CANCELED: "#f43f5e",
};
const STATUS_LABEL = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  DONE: "Hoàn tất",
  CANCELED: "Đã hủy",
};
const DOW_LABEL = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded bg-base-200 ${className}`} />;
}

// Format ISO -> "HH:MM DD/MM"
function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hm = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dm = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return `${hm} ${dm}`;
}

const VN_TZ = "Asia/Ho_Chi_Minh";

export default function DoctorHome() {
  const appointmentsQ = useQuery({
    queryKey: ["doctor-appointments", ""],
    queryFn: () => listAppointments({ page: 1, limit: 200 }),
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  const appointments = useMemo(() => appointmentsQ.data?.data ?? [], [appointmentsQ.data]);
  const loading = appointmentsQ.isLoading;

  /* --- Summary stats --- */
  const stats = useMemo(
    () =>
      appointments.reduce(
        (acc, a) => { acc.total += 1; acc[a.status] += 1; return acc; },
        { total: 0, PENDING: 0, CONFIRMED: 0, DONE: 0, CANCELED: 0 }
      ),
    [appointments]
  );

  /* --- Pie data --- */
  const pieData = useMemo(
    () =>
      ["PENDING", "CONFIRMED", "DONE", "CANCELED"]
        .map((s) => ({ name: STATUS_LABEL[s], value: stats[s], color: STATUS_COLOR[s] }))
        .filter((d) => d.value > 0),
    [stats]
  );

  /* --- Bar: lịch hẹn theo thứ trong tuần (tất cả thời gian) --- */
  const byDow = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const a of appointments) {
      if (!a.slotStartAt) continue;
      const dow = new Date(a.slotStartAt).toLocaleDateString("en-US", { weekday: "short", timeZone: VN_TZ });
      const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const idx = map[dow];
      if (idx !== undefined) counts[idx] += 1;
    }
    return DOW_LABEL.map((label, i) => ({ label, "Lịch hẹn": counts[i] }));
  }, [appointments]);

  /* --- NEW: Area: xu hướng 14 ngày gần nhất --- */
  const byDay14 = useMemo(() => {
    const now = new Date();
    const map = new Map();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString("sv-SE", { timeZone: VN_TZ });
      map.set(key, { date: key, total: 0, DONE: 0, CANCELED: 0 });
    }
    for (const a of appointments) {
      if (!a.slotStartAt) continue;
      const key = new Date(a.slotStartAt).toLocaleDateString("sv-SE", { timeZone: VN_TZ });
      if (map.has(key)) {
        const e = map.get(key);
        e.total += 1;
        if (a.status === "DONE" || a.status === "CANCELED") e[a.status] += 1;
      }
    }
    return [...map.values()];
  }, [appointments]);

  /* --- NEW: Bar: phân bổ theo giờ trong ngày --- */
  const byHour = useMemo(() => {
    const counts = {};
    for (let h = 7; h <= 18; h++) counts[h] = 0;
    for (const a of appointments) {
      if (!a.slotStartAt) continue;
      const h = parseInt(
        new Date(a.slotStartAt).toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: VN_TZ }),
        10
      );
      if (h >= 7 && h <= 18) counts[h] = (counts[h] ?? 0) + 1;
    }
    return Object.entries(counts).map(([h, v]) => ({ giờ: `${h}h`, "Lịch hẹn": v }));
  }, [appointments]);

  /* --- Upcoming appointments (PENDING + CONFIRMED, future) --- */
  const upcoming = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((a) => (a.status === "PENDING" || a.status === "CONFIRMED") && new Date(a.slotStartAt) > now)
      .sort((a, b) => new Date(a.slotStartAt) - new Date(b.slotStartAt))
      .slice(0, 5);
  }, [appointments]);

  const SUMMARY_CARDS = [
    { label: "Tổng lịch",      value: stats.total,     color: "text-base-content" },
    { label: "Chờ xác nhận",   value: stats.PENDING,   color: "text-amber-500"    },
    { label: "Đã xác nhận",    value: stats.CONFIRMED, color: "text-blue-500"     },
    { label: "Hoàn tất",       value: stats.DONE,      color: "text-emerald-500"  },
    { label: "Đã hủy",         value: stats.CANCELED,  color: "text-rose-500"     },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">Dashboard bác sĩ</h1>
        <p className="mt-1 text-sm opacity-60">
          Theo dõi lịch khám, xác nhận và hoàn tất lịch hẹn của bạn.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {SUMMARY_CARDS.map((card) => (
          <div key={card.label} className="rounded-2xl bg-base-100 p-4 shadow">
            <div className="text-xs opacity-60">{card.label}</div>
            <div className={`mt-2 text-3xl font-bold ${card.color}`}>
              {loading ? <Skeleton className="h-8 w-12" /> : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Row: Pie + Upcoming */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Pie */}
        <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
          <h2 className="text-base font-semibold mb-4">Phân bổ trạng thái lịch hẹn</h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : pieData.length === 0 ? (
            <p className="text-sm opacity-50 text-center py-14">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [val + " lịch", name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming */}
        <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
          <h2 className="text-base font-semibold mb-4">Lịch hẹn sắp tới</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm opacity-50 text-center py-14">Không có lịch nào sắp tới</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-base-200 px-3 py-2">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white shrink-0"
                    style={{ backgroundColor: STATUS_COLOR[a.status] }}
                  >
                    {STATUS_LABEL[a.status]}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.patientName ?? a.patient?.fullName ?? "Bệnh nhân"}</div>
                    <div className="text-xs opacity-60">{fmtDateTime(a.slotStartAt)} · {a.serviceName ?? a.service?.name ?? ""}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bar: lịch hẹn theo thứ */}
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h2 className="text-base font-semibold mb-4">Phân bổ lịch hẹn theo thứ trong tuần</h2>
        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byDow} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Lịch hẹn" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* NEW: Area — xu hướng hoàn tất & hủy 14 ngày */}
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h2 className="text-base font-semibold mb-4">Xu hướng hoàn tất &amp; hủy 14 ngày gần nhất</h2>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={byDay14} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gDoneDoc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLOR.DONE} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={STATUS_COLOR.DONE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCanceledDoc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLOR.CANCELED} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={STATUS_COLOR.CANCELED} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => { const [,m,day] = d.split("-"); return `${day}/${m}`; }}
                tick={{ fontSize: 11 }}
                interval={1}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v, n) => [v, n]}
                labelFormatter={(l) => { const [,m,d] = l.split("-"); return `Ngày ${d}/${m}`; }}
              />
              <Legend />
              <Area type="monotone" dataKey="DONE"     name="Hoàn tất" stroke={STATUS_COLOR.DONE}     fill="url(#gDoneDoc)"     strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="CANCELED" name="Đã hủy"   stroke={STATUS_COLOR.CANCELED} fill="url(#gCanceledDoc)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* NEW: Bar — phân bổ theo giờ trong ngày */}
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h2 className="text-base font-semibold mb-4">Lịch hẹn theo khung giờ trong ngày</h2>
        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byHour} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="giờ" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Lịch hẹn" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
