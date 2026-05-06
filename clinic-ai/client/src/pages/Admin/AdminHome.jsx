import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { getAdminStats } from "../../services/admin.service";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStethoscope, faUserDoctor, faClock, faCircleCheck, faCheckDouble, faXmark,
  faUsers, faCalendarCheck,
} from "@fortawesome/free-solid-svg-icons";
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
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

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded bg-base-200 ${className}`} />;
}

const SUMMARY_CARDS = [
  { key: "services",  label: "Dịch vụ",       icon: faStethoscope,  iconColor: "text-violet-500" },
  { key: "doctors",   label: "Bác sĩ",         icon: faUserDoctor,   iconColor: "text-sky-500"    },
  { key: "patients",  label: "Bệnh nhân",     icon: faUsers,        iconColor: "text-teal-500"   },
  { key: "total",     label: "Tổng lịch hẹn", icon: faCalendarCheck, iconColor: "text-indigo-500" },
  { key: "PENDING",   label: "Chờ xác nhận",  icon: faClock,        iconColor: "text-amber-500"  },
  { key: "CONFIRMED", label: "Đã xác nhận",    icon: faCircleCheck,  iconColor: "text-blue-500"   },
  { key: "DONE",      label: "Hoàn tất",       icon: faCheckDouble,  iconColor: "text-emerald-500" },
  { key: "CANCELED",  label: "Đã hủy",        icon: faXmark,        iconColor: "text-rose-500"   },
];

// Format date "YYYY-MM-DD" -> "DD/MM"
function fmtDay(d) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

export default function AdminHome() {
  const [loading, setLoading] = useState(true);
  const [serviceCount, setServiceCount] = useState(0);
  const [doctorCount, setDoctorCount] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [svcRes, docRes, patRes, statsRes] = await Promise.allSettled([
          api.get("/services", { params: { page: 1, limit: 1 } }),
          api.get("/doctors",  { params: { page: 1, limit: 1, includeInactive: true } }),
          api.get("/admin/users", { params: { role: "PATIENT", limit: 1 } }),
          getAdminStats({}),
        ]);

        if (svcRes.status === "fulfilled") {
          setServiceCount(svcRes.value.data?.meta?.total ?? svcRes.value.data?.data?.length ?? 0);
        }
        if (docRes.status === "fulfilled") {
          setDoctorCount(docRes.value.data?.meta?.total ?? docRes.value.data?.data?.length ?? 0);
        }
        if (patRes.status === "fulfilled") {
          setPatientCount(patRes.value.data?.meta?.total ?? 0);
        }
        if (statsRes.status === "fulfilled") {
          // getAdminStats returns res.data = { success, data: {...stats} }
          const payload = statsRes.value;
          setStats(payload?.data ?? payload);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const summaryValues = {
    services: serviceCount,
    doctors:  doctorCount,
    patients: patientCount,
    total:    stats?.totalAppointments ?? 0,
    PENDING:   stats?.byStatus?.PENDING   ?? 0,
    CONFIRMED: stats?.byStatus?.CONFIRMED ?? 0,
    DONE:      stats?.byStatus?.DONE      ?? 0,
    CANCELED:  stats?.byStatus?.CANCELED  ?? 0,
  };

  const byDay    = stats?.byDay     ?? [];
  const chartDays = byDay.slice(-14);

  // Pie data
  const pieData = ["PENDING", "CONFIRMED", "DONE", "CANCELED"]
    .map((s) => ({ name: STATUS_LABEL[s], value: summaryValues[s], color: STATUS_COLOR[s] }))
    .filter((d) => d.value > 0);

  // Top services / doctors bar data
  const topServices = (stats?.topServices ?? []).map((s) => ({
    name: s.serviceName.length > 18 ? s.serviceName.slice(0, 16) + "�" : s.serviceName,
    "Lịch hẹn": s.totalAppointments,
  }));
  const topDoctors = (stats?.topDoctors ?? []).map((d) => ({
    name: d.fullName.replace(/^BS\.?\s*/i, "").slice(0, 14),
    "Lịch hẹn": d.totalAppointments,
  }));

  // NEW: by day-of-week from byDay (30 days aggregated)
  const byDow = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const d of byDay) {
      const dow = new Date(d.date + "T00:00:00").getDay(); // 0=Sun
      counts[dow] += d.total;
    }
    return ["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((l, i) => ({
      label: l,
      "Lịch hẹn": counts[i],
    }));
  }, [byDay]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">Admin — Tổng quan</h1>
        <p className="mt-1 text-sm opacity-60">
          Quản lý dịch vụ, bác sĩ, lịch làm việc và theo dõi lịch hẹn.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
          <div key={card.key} className="rounded-2xl bg-base-100 p-4 shadow flex flex-col gap-2">
            <div className="text-xs opacity-60">{card.label}</div>
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={card.icon} className={`text-2xl ${card.iconColor}`} />
              <div className="text-3xl font-bold">
                {loading ? <Skeleton className="h-8 w-12" /> : summaryValues[card.key]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Area chart — lịch hẹn 14 ngày gần nhất */}
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h2 className="text-base font-semibold mb-4">Lịch hẹn 14 ngày gần nhất</h2>
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartDays} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLOR.PENDING} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={STATUS_COLOR.PENDING} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gConfirmed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLOR.CONFIRMED} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={STATUS_COLOR.CONFIRMED} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={STATUS_COLOR.DONE} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={STATUS_COLOR.DONE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 11 }} interval={1} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val, name) => [val, STATUS_LABEL[name] ?? name]}
                labelFormatter={(l) => `Ngày ${fmtDay(l)}`}
              />
              <Legend formatter={(v) => STATUS_LABEL[v] ?? v} />
              <Area type="monotone" dataKey="PENDING"   stroke={STATUS_COLOR.PENDING}   fill="url(#gPending)"   strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="CONFIRMED" stroke={STATUS_COLOR.CONFIRMED} fill="url(#gConfirmed)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="DONE"      stroke={STATUS_COLOR.DONE}      fill="url(#gDone)"      strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* NEW: Line chart — DONE vs CANCELED 14 ngày */}
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h2 className="text-base font-semibold mb-4">Tỷ lệ hoàn tất &amp; hủy 14 ngày gần nhất</h2>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartDays} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 11 }} interval={1} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val, name) => [val, STATUS_LABEL[name] ?? name]}
                labelFormatter={(l) => `Ngày ${fmtDay(l)}`}
              />
              <Legend formatter={(v) => STATUS_LABEL[v] ?? v} />
              <Line type="monotone" dataKey="DONE"     stroke={STATUS_COLOR.DONE}     strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="CANCELED" stroke={STATUS_COLOR.CANCELED} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row: Pie + Top services */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Pie — phân bổ trạng thái */}
        <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
          <h2 className="text-base font-semibold mb-4">Phân bổ trạng thái lịch hẹn</h2>
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : pieData.length === 0 ? (
            <p className="text-sm opacity-50 text-center py-16">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
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

        {/* NEW: Bar — phân bổ theo thứ trong tuần */}
        <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
          <h2 className="text-base font-semibold mb-4">Lịch hẹn theo thứ trong tuần (30 ngày)</h2>
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDow} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Lịch hẹn" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row: Top services + Top doctors */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Bar — top dịch vụ */}
        <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
          <h2 className="text-base font-semibold mb-4">Top dịch vụ được đặt nhiều</h2>
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : topServices.length === 0 ? (
            <p className="text-sm opacity-50 text-center py-16">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topServices} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="Lịch hẹn" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar — top bác sĩ */}
        <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
          <h2 className="text-base font-semibold mb-4">Top bác sĩ được đặt lịch nhiều</h2>
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : topDoctors.length === 0 ? (
            <p className="text-sm opacity-50 text-center py-16">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topDoctors} margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Lịch hẹn" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
