import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { listAppointments } from "../../services/appointment.service";
import { getAdminStats } from "../../services/admin.service";
import { listDoctors } from "../../services/doctor.service";
import { listServices } from "../../services/service.service";
import FilterBar from "../../components/ui/FilterBar";
import DataTable from "../../components/ui/DataTable";
import DetailDrawer from "../../components/ui/DetailDrawer";
import {
  appointmentStatusClass,
  appointmentStatusLabel,
  formatDateTime,
  formatCurrency,
} from "../../utils/booking";

function doctorCode(id) { return id ? id.slice(-8).toUpperCase() : ""; }

export default function AdminAppointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const query = useMemo(
    () => ({
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 10),
      status: searchParams.get("status") || "",
      doctorId: searchParams.get("doctorId") || "",
      serviceId: searchParams.get("serviceId") || "",
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
      search: searchParams.get("search") || "",
      sortBy: searchParams.get("sortBy") || "slotStartAt",
      sortOrder: searchParams.get("sortOrder") || "asc",
    }),
    [searchParams]
  );

  const appointmentsQ = useQuery({
    queryKey: ["admin-appointments", query],
    queryFn: () => listAppointments({
      ...query,
      status: query.status || undefined,
      doctorId: query.doctorId || undefined,
      serviceId: query.serviceId || undefined,
      from: query.from || undefined,
      to: query.to || undefined,
      search: query.search || undefined,
    }),
    keepPreviousData: true,
  });

  const statsQ = useQuery({
    queryKey: ["admin-stats", query.from, query.to],
    queryFn: () => getAdminStats({ from: query.from || undefined, to: query.to || undefined }),
  });

  const doctorsQ = useQuery({
    queryKey: ["admin-doctors-options"],
    queryFn: () => listDoctors({ page: 1, limit: 200, includeInactive: true }),
  });

  const servicesQ = useQuery({
    queryKey: ["admin-services-options"],
    queryFn: () => listServices({ page: 1, limit: 200 }),
  });

  const appointments = appointmentsQ.data?.data || [];
  const meta = appointmentsQ.data?.meta || { page: 1, totalPages: 1, total: 0 };
  const stats = statsQ.data?.data || {
    totalAppointments: 0,
    byStatus: { PENDING: 0, CONFIRMED: 0, DONE: 0, CANCELED: 0 },
  };

  const doctors = doctorsQ.data?.data || [];
  const services = servicesQ.data?.data || [];

  function updateQuery(next) {
    const merged = { ...query, ...next };
    const sp = new URLSearchParams();

    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "") {
        sp.set(k, String(v));
      }
    });

    setSearchParams(sp, { replace: true });
  }

  const columns = useMemo(
    () => [
      {
        key: "patient",
        header: "Bệnh nhân",
        render: (appointment) => appointment.patient?.fullName || appointment.patient?.email,
      },
      {
        key: "doctor",
        header: "Bác sĩ",
        render: (appointment) => appointment.doctor
          ? `${appointment.doctor.fullName} #${doctorCode(appointment.doctor.id)}`
          : "-",
      },
      {
        key: "service",
        header: "Dịch vụ",
        render: (appointment) => appointment.service?.name || "-",
      },
      {
        key: "slotStartAt",
        header: "Thời gian",
        render: (appointment) => formatDateTime(appointment.slotStartAt),
      },
      {
        key: "price",
        header: "Giá (VNĐ)",
        render: (appointment) => {
          const price = appointment.priceSnapshot ?? appointment.service?.price;
          return price != null ? (
            <span className="font-semibold text-success whitespace-nowrap">{formatCurrency(price)}</span>
          ) : "-";
        },
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (appointment) => (
          <span className={`badge ${appointmentStatusClass(appointment.status)}`}>
            {appointmentStatusLabel(appointment.status)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-3xl bg-base-100 p-5 shadow sm:p-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Admin Appointments Dashboard</h1>
        <p className="mt-1 text-sm opacity-70">Filter/sort/pagination server-side, đồng bộ query lên URL.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Tổng", value: stats.totalAppointments },
          { label: "Chờ xác nhận", value: stats.byStatus?.PENDING || 0 },
          { label: "Đã xác nhận", value: stats.byStatus?.CONFIRMED || 0 },
          { label: "Hoàn tất", value: stats.byStatus?.DONE || 0 },
          { label: "Đã hủy", value: stats.byStatus?.CANCELED || 0 },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-base-100 p-4 shadow">
            <div className="text-xs opacity-70">{item.label}</div>
            <div className="mt-1 text-2xl font-semibold">{item.value}</div>
          </div>
        ))}
      </div>

      <FilterBar>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select className="select select-bordered" value={query.status} onChange={(e) => updateQuery({ status: e.target.value, page: 1 })}>
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="DONE">Hoàn tất</option>
            <option value="CANCELED">Đã hủy</option>
          </select>
          <select className="select select-bordered" value={query.doctorId} onChange={(e) => updateQuery({ doctorId: e.target.value, page: 1 })}>
            <option value="">Tất cả bác sĩ</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.fullName} — #{doctorCode(d.id)}</option>
            ))}
          </select>
          <select className="select select-bordered" value={query.serviceId} onChange={(e) => updateQuery({ serviceId: e.target.value, page: 1 })}>
            <option value="">Tất cả dịch vụ</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input className="input input-bordered" placeholder="Tìm bệnh nhân/bác sĩ/dịch vụ" value={query.search} onChange={(e) => updateQuery({ search: e.target.value, page: 1 })} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="date" className="input input-bordered" value={query.from} onChange={(e) => updateQuery({ from: e.target.value, page: 1 })} />
          <input type="date" className="input input-bordered" value={query.to} onChange={(e) => updateQuery({ to: e.target.value, page: 1 })} />
          <select className="select select-bordered" value={query.sortBy} onChange={(e) => updateQuery({ sortBy: e.target.value })}>
            <option value="slotStartAt">Sort: slotStartAt</option>
            <option value="createdAt">Sort: createdAt</option>
          </select>
          <select className="select select-bordered" value={query.sortOrder} onChange={(e) => updateQuery({ sortOrder: e.target.value })}>
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={appointments}
        loading={appointmentsQ.isLoading}
        emptyText="Không có dữ liệu."
        onRowClick={setSelectedAppointment}
      />

      <div className="rounded-2xl border border-base-200 bg-base-100 p-4 sm:p-5">
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm opacity-70">Tổng: {meta.total}</div>
          <div className="join">
            <button
              className="btn btn-sm join-item"
              disabled={meta.page <= 1}
              onClick={() => updateQuery({ page: meta.page - 1 })}
            >
              Prev
            </button>
            <button className="btn btn-sm join-item pointer-events-none">{meta.page}/{meta.totalPages}</button>
            <button
              className="btn btn-sm join-item"
              disabled={meta.page >= meta.totalPages}
              onClick={() => updateQuery({ page: meta.page + 1 })}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <DetailDrawer
        open={Boolean(selectedAppointment)}
        title="Chi tiết lịch hẹn"
        subtitle={selectedAppointment ? formatDateTime(selectedAppointment.slotStartAt) : ""}
        onClose={() => setSelectedAppointment(null)}
      >
        {selectedAppointment && (
          <div className="space-y-3 text-sm">
            <div><span className="font-semibold">Bệnh nhân:</span> {selectedAppointment.patient?.fullName || selectedAppointment.patient?.email}</div>
            <div><span className="font-semibold">Email:</span> {selectedAppointment.patient?.email || "-"}</div>
            <div><span className="font-semibold">SĐT:</span> {selectedAppointment.patient?.phone || "-"}</div>
            <div><span className="font-semibold">Bác sĩ:</span> {selectedAppointment.doctor
              ? `${selectedAppointment.doctor.fullName} (#${doctorCode(selectedAppointment.doctor.id)})`
              : "-"}</div>
            <div><span className="font-semibold">Dịch vụ:</span> {selectedAppointment.service?.name || "-"}</div>
            <div><span className="font-semibold">Lý do khám:</span> {selectedAppointment.reason || "-"}</div>
            {(() => {
              const price = selectedAppointment.priceSnapshot ?? selectedAppointment.service?.price;
              return price != null ? (
                <div className="flex items-center gap-2 pt-2 mt-1 border-t border-base-200">
                  <span className="font-semibold">Phí dịch vụ:</span>
                  <span className="font-bold text-success">{formatCurrency(price)}</span>
                  {selectedAppointment.priceSnapshot != null && (
                    <span className="text-xs opacity-50">(tại thời điểm đặt)</span>
                  )}
                </div>
              ) : null;
            })()}
            <div>
              <span className="font-semibold">Trạng thái:</span>{" "}
              <span className={`badge ${appointmentStatusClass(selectedAppointment.status)}`}>
                {appointmentStatusLabel(selectedAppointment.status)}
              </span>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
