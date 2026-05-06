import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getDoctor } from "../../services/doctor.service";
import { api } from "../../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCalendarDays, faClock, faStar } from "@fortawesome/free-solid-svg-icons";
import { useBootAuth } from "../../context/useBootAuth";
import { useMemo } from "react";

const DOW_LABEL = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DOW_FULL  = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const PLACEHOLDER_AVATAR = "https://placehold.co/120x120?text=BS";

function pad(n) { return String(n).padStart(2, "0"); }

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me } = useBootAuth();

  const doctorQ = useQuery({
    queryKey: ["doctor", id],
    queryFn: () => getDoctor(id),
  });

  // Fetch upcoming slots (next 30 days) to derive working schedule
  const today = new Date().toISOString().slice(0, 10);
  const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + 30);
  const future = futureDate.toISOString().slice(0, 10);
  const upcomingSlotsQ = useQuery({
    queryKey: ["doctorUpcomingSlots", id],
    enabled: Boolean(id),
    queryFn: () =>
      api.get("/slots/range", { params: { doctorId: id, from: today, to: future } })
        .then((r) => r.data?.data || []),
  });

  const doctor = doctorQ.data?.data;
  const slots = upcomingSlotsQ.data || [];

  const firstService = useMemo(() => doctor?.services?.[0], [doctor]);

  // Derive unique working days + time ranges from actual slots
  const workingDays = useMemo(() => {
    const hoursByDow = new Map();
    slots.forEach((slot) => {
      const d = new Date(slot.startAt);
      const dow = d.getDay();
      const hour = d.getHours();
      if (!hoursByDow.has(dow)) hoursByDow.set(dow, new Set());
      hoursByDow.get(dow).add(hour);
    });
    return [...hoursByDow.entries()]
      .sort(([a], [b]) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
      .map(([dow, hourSet]) => {
        const hours = [...hourSet].sort((a, b) => a - b);
        const ranges = [];
        let start = null, prev = null;
        hours.forEach((h) => {
          if (start === null) { start = h; prev = h; }
          else if (h === prev + 1) { prev = h; }
          else { ranges.push(`${pad(start)}:00–${pad(prev + 1)}:00`); start = h; prev = h; }
        });
        if (start !== null) ranges.push(`${pad(start)}:00–${pad(prev + 1)}:00`);
        return { dow, times: ranges };
      });
  }, [slots]);

  const hasSchedule = workingDays.length > 0;

  return (
    <div className="space-y-4 max-w-[1200px] mx-auto p-4 sm:p-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-bold transition-all mb-4 group"
      >
        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-all">
          <FontAwesomeIcon icon={faArrowLeft} />
        </div>
        Quay lại
      </button>

      {/* ── Doctor header card ── */}
      <div className="rounded-2xl bg-base-100 p-4 sm:p-6 shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={doctor?.avatarUrl || PLACEHOLDER_AVATAR}
              alt={doctor?.fullName}
              className="h-20 w-20 rounded-full object-cover border-2 border-base-200 shrink-0"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">
                {doctorQ.isLoading ? "Đang tải..." : `BS. ${doctor?.fullName || ""}`}
              </h1>
              {!doctorQ.isLoading && doctor && (
                <p className="mt-1 text-sm text-emerald-600 font-medium">{doctor.specialty}</p>
              )}
              {hasSchedule && (
                <p className="mt-1 text-xs text-base-content/50 flex items-center gap-1">
                  <FontAwesomeIcon icon={faClock} className="text-emerald-400" />
                  Đang nhận lịch khám
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {doctor && firstService && (
              me?.role === "PATIENT" ? (
                <Link
                  to={`/booking?doctorId=${doctor.id}&serviceId=${firstService.id}`}
                  className="btn btn-primary flex-1 sm:flex-none"
                >
                  <FontAwesomeIcon icon={faCalendarDays} />
                  Đặt lịch khám
                </Link>
              ) : (
                <Link to="/login" className="btn btn-outline flex-1 sm:flex-none">
                  Đăng nhập để đặt lịch
                </Link>
              )
            )}
          </div>
        </div>

        {doctorQ.error && (
          <div className="alert alert-error mt-4">Không tìm thấy thông tin bác sĩ.</div>
        )}

        {!doctorQ.isLoading && doctor?.bio && (
          <p className="mt-4 text-sm text-base-content/80 leading-relaxed border-t border-base-200 pt-4">
            {doctor.bio}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Services */}
          <div className="rounded-2xl bg-base-100 p-4 sm:p-6 shadow">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FontAwesomeIcon icon={faStar} className="text-amber-400 text-sm" />
              Dịch vụ khám
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {doctor?.services?.map((s) => (
                <Link
                  key={s.id}
                  to={
                    me?.role === "PATIENT"
                      ? `/booking?doctorId=${doctor.id}&serviceId=${s.id}`
                      : "/login"
                  }
                  className="badge badge-ghost hover:badge-primary transition-all cursor-pointer py-3 px-3 text-sm"
                >
                  {s.name}
                </Link>
              ))}
              {(!doctor?.services || doctor.services.length === 0) && !doctorQ.isLoading && (
                <p className="text-sm text-base-content/50">Chưa có thông tin dịch vụ.</p>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-2xl bg-base-100 p-4 sm:p-6 shadow">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendarDays} className="text-sky-500 text-sm" />
              Lịch làm việc
            </h2>

            {upcomingSlotsQ.isLoading && (
              <div className="mt-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-base-200" />
                ))}
              </div>
            )}

            {!upcomingSlotsQ.isLoading && !hasSchedule && (
              <p className="mt-3 text-sm text-base-content/50">
                Lịch làm việc sẽ được cập nhật sớm.
              </p>
            )}

            {!upcomingSlotsQ.isLoading && hasSchedule && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {workingDays.map(({ dow, times }) => (
                  <div
                    key={dow}
                    className="flex items-start justify-between rounded-xl border border-base-200 px-4 py-3 bg-base-50"
                  >
                    <span className="font-medium text-sm">{DOW_FULL[dow]}</span>
                    <div className="text-right space-y-0.5">
                      {times.map((t, i) => (
                        <div key={i} className="text-xs text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <aside className="space-y-4">
          {/* CTA card */}
          <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-6 shadow border border-green-200">
            <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendarDays} />
              Đặt lịch khám
            </h3>
            <p className="mt-2 text-sm text-green-600">
              Khám với BS. {doctor?.fullName || "chuyên khoa"} tại phòng khám của chúng tôi
            </p>

            {doctor && firstService && (
              me?.role === "PATIENT" ? (
                <Link
                  to={`/booking?doctorId=${doctor.id}&serviceId=${firstService.id}`}
                  className="btn btn-success btn-block mt-4"
                >
                  Chọn ngày khám
                </Link>
              ) : (
                <Link to="/login" className="btn btn-outline btn-block mt-4">
                  Đăng nhập để đặt lịch
                </Link>
              )
            )}
          </div>

          {/* Availability summary */}
          <div className="rounded-2xl bg-base-100 p-4 sm:p-6 shadow">
            <h3 className="text-base font-semibold">Khả dụng</h3>

            {upcomingSlotsQ.isLoading ? (
              <div className="mt-3 space-y-2">
                <div className="h-5 animate-pulse rounded bg-base-200 w-3/4" />
                <div className="h-5 animate-pulse rounded bg-base-200 w-1/2" />
              </div>
            ) : hasSchedule ? (
              <>
                <p className="mt-3 text-sm font-medium text-emerald-600 flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  Đang nhận lịch
                </p>
                <p className="mt-2 text-xs text-base-content/60">
                  Làm việc: {workingDays.map((d) => DOW_LABEL[d.dow]).join(", ")}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-base-content/50">Chưa có lịch làm việc.</p>
            )}
          </div>

          {/* Tips */}
          <div className="rounded-2xl bg-blue-50 p-4 sm:p-6 shadow border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900">Lưu ý khi đặt lịch</h3>
            <ul className="mt-2 space-y-1 text-xs text-blue-800">
              <li>• Kiểm tra khung giờ trống trước khi đặt</li>
              <li>• Có thể hủy hoặc đổi lịch trong mục Lịch hẹn của tôi</li>
              <li>• Vui lòng đến đúng giờ đã đặt</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}


