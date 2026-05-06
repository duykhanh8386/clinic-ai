import { prisma } from "../config/prisma.js";
import { endOfDay, startOfDay } from "../utils/bookingDate.js";

function buildDateWhere({ from, to }) {
  if (!from && !to) return {};

  return {
    slotStartAt: {
      ...(from ? { gte: startOfDay(from) } : {}),
      ...(to ? { lte: endOfDay(to) } : {}),
    },
  };
}

export async function getAdminStats({ from, to }) {
  const where = buildDateWhere({ from, to });

  // For byDay we always look at the last 30 days regardless of filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  const dayWhere = {
    slotStartAt: { gte: startOfDay(thirtyDaysAgo.toISOString().slice(0, 10)), lte: endOfDay(now.toISOString().slice(0, 10)) },
  };

  const [totalAppointments, groupedStatus, groupedServices, groupedDoctors, recentAppointments] =
    await prisma.$transaction([
      prisma.appointment.count({ where }),
      prisma.appointment.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ["serviceId"],
        where,
        _count: { _all: true },
        orderBy: { _count: { serviceId: "desc" } },
        take: 5,
      }),
      prisma.appointment.groupBy({
        by: ["doctorId"],
        where,
        _count: { _all: true },
        orderBy: { _count: { doctorId: "desc" } },
        take: 5,
      }),
      prisma.appointment.findMany({
        where: dayWhere,
        select: { slotStartAt: true, status: true },
      }),
    ]);

  const serviceIds = groupedServices.map((item) => item.serviceId);
  const services = serviceIds.length
    ? await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, name: true, specialty: true },
      })
    : [];

  const doctorIds = groupedDoctors.map((item) => item.doctorId);
  const doctorProfiles = doctorIds.length
    ? await prisma.doctorProfile.findMany({
        where: { id: { in: doctorIds } },
        select: { id: true, fullName: true, specialty: true },
      })
    : [];

  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const doctorMap = new Map(doctorProfiles.map((d) => [d.id, d]));

  const byStatus = { PENDING: 0, CONFIRMED: 0, DONE: 0, CANCELED: 0 };
  for (const item of groupedStatus) {
    byStatus[item.status] = item._count._all;
  }

  const topServices = groupedServices.map((item) => ({
    serviceId: item.serviceId,
    serviceName: serviceMap.get(item.serviceId)?.name ?? "Unknown",
    specialty: serviceMap.get(item.serviceId)?.specialty ?? null,
    totalAppointments: item._count._all,
  }));

  const topDoctors = groupedDoctors.map((item) => ({
    doctorProfileId: item.doctorId,
    fullName: doctorMap.get(item.doctorId)?.fullName ?? "Unknown",
    specialty: doctorMap.get(item.doctorId)?.specialty ?? null,
    totalAppointments: item._count._all,
  }));

  // Build byDay: last 30 days, count all appointments (regardless of status)
  const tz = "Asia/Ho_Chi_Minh";
  const dayMap = new Map();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(thirtyDaysAgo.getDate() + i);
    const key = d.toLocaleDateString("sv-SE", { timeZone: tz }); // "YYYY-MM-DD"
    dayMap.set(key, { date: key, total: 0, PENDING: 0, CONFIRMED: 0, DONE: 0, CANCELED: 0 });
  }
  for (const appt of recentAppointments) {
    const key = new Date(appt.slotStartAt).toLocaleDateString("sv-SE", { timeZone: tz });
    if (dayMap.has(key)) {
      const entry = dayMap.get(key);
      entry.total += 1;
      if (entry[appt.status] !== undefined) entry[appt.status] += 1;
    }
  }
  const byDay = [...dayMap.values()];

  return {
    totalAppointments,
    byStatus,
    topServices,
    topDoctors,
    byDay,
  };
}
