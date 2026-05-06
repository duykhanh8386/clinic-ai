import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listDoctors } from "../../services/doctor.service";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch, faUserMd, faCalendarPlus, faChevronRight,
  faTimesCircle, faCircle, faStethoscope,
} from "@fortawesome/free-solid-svg-icons";
import { useBootAuth } from "../../context/useBootAuth";

const PLACEHOLDER_AVATAR = "https://placehold.co/200x200?text=BS";

const SPECIALTY_PALETTE = {
  "Mắt":       { bg: "bg-blue-50",   text: "text-blue-600",   dot: "bg-blue-400" },
  "Tim mạch":  { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400" },
  "Nhi":       { bg: "bg-yellow-50", text: "text-yellow-600", dot: "bg-yellow-400" },
  "Da liễu":   { bg: "bg-pink-50",   text: "text-pink-600",   dot: "bg-pink-400" },
  "Thần kinh": { bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-400" },
  "Xương khớp":{ bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-400" },
};
function spColor(sp) {
  return SPECIALTY_PALETTE[sp] || { bg: "bg-green-50", text: "text-green-600", dot: "bg-green-400" };
}

export default function Doctors() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const { me } = useBootAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => listDoctors({ page: 1, limit: 50 }),
  });

  const allDoctors = data?.data || [];
  const specialties = [...new Set(allDoctors.map((d) => d.specialty).filter(Boolean))].sort();
  const doctors = allDoctors.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !search || d.fullName.toLowerCase().includes(q) || (d.specialty || "").toLowerCase().includes(q);
    const matchSpecialty = !specialty || d.specialty === specialty;
    return matchSearch && matchSpecialty;
  });

  return (
    <div className="font-latoV min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <div className="bg_main relative overflow-hidden py-16 px-4">
        <div className="absolute inset-0">
          <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full bg-white/5" />
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4">
                <FontAwesomeIcon icon={faUserMd} className="text-white text-sm" />
                <span className="text-white font-medium text-sm tracking-wide">Đội ngũ chuyên gia y tế</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                Bác sĩ <br className="hidden sm:block" />
                <span className="text-white/90">của chúng tôi</span>
              </h1>
              <p className="mt-4 text-white/80 text-base max-w-lg leading-relaxed">
                Đội ngũ bác sĩ chuyên khoa giàu kinh nghiệm, tận tâm và chu đáo trong từng ca khám.
              </p>
            </div>
            {allDoctors.length > 0 && (
              <div className="flex gap-4 shrink-0">
                <div className="bg-white/20 backdrop-blur rounded-2xl px-6 py-4 text-center text-white">
                  <div className="text-4xl font-bold">{allDoctors.length}</div>
                  <div className="text-sm text-white/80 mt-1">bác sĩ</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-2xl px-6 py-4 text-center text-white">
                  <div className="text-4xl font-bold">{specialties.length}</div>
                  <div className="text-sm text-white/80 mt-1">chuyên khoa</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky filter bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="py-3 flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-sm shrink-0" />
              <input
                className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent min-w-0"
                placeholder="Tìm theo tên bác sĩ hoặc chuyên khoa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <FontAwesomeIcon icon={faTimesCircle} className="text-sm" />
                </button>
              )}
            </div>
            {doctors.length > 0 && (
              <span className="shrink-0 text-sm text-gray-500 font-medium whitespace-nowrap">
                {doctors.length} bác sĩ
              </span>
            )}
          </div>
          {specialties.length > 0 && (
            <div className="flex items-center gap-2 pb-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSpecialty("")}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  specialty === ""
                    ? "bg_main text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Tất cả
              </button>
              {specialties.map((sp) => {
                const c = spColor(sp);
                return (
                  <button
                    key={sp}
                    onClick={() => setSpecialty(sp === specialty ? "" : sp)}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      specialty === sp
                        ? "bg_main text-white shadow-sm"
                        : `${c.bg} ${c.text} hover:opacity-80`
                    }`}
                  >
                    {sp}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="font-semibold text-red-500">Không tải được dữ liệu. Vui lòng thử lại.</p>
          </div>
        )}

        {!isLoading && !error && doctors.length === 0 && (
          <div className="text-center py-24 text-gray-400">
            <div className="text-6xl mb-5">👨‍⚕️</div>
            <p className="font-semibold text-xl">Không tìm thấy bác sĩ nào</p>
            <p className="text-sm mt-2">Thử tìm với từ khóa khác hoặc chọn chuyên khoa khác</p>
            {(search || specialty) && (
              <button
                onClick={() => { setSearch(""); setSpecialty(""); }}
                className="mt-4 text-sm text-green-600 underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && doctors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((d) => {
              const c = spColor(d.specialty);
              const bookingParams = new URLSearchParams({
                doctorId: d.id,
                serviceId: d.services?.[0]?.id || "",
              });
              if (d.specialty) bookingParams.set("specialty", d.specialty);
              return (
                <div
                  key={d.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group flex flex-col"
                >
                  {/* Top gradient accent */}
                  <div className="h-1 bg_main" />

                  {/* Avatar section */}
                  <div className="relative pt-7 px-6 pb-4 flex flex-col items-center text-center">
                    <div className="relative">
                      <img
                        src={d.avatarUrl || PLACEHOLDER_AVATAR}
                        alt={d.fullName}
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform duration-300"
                      />
                      <span
                        className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-green-400 border-2 border-white"
                        title="Đang hoạt động"
                      />
                    </div>
                    <h3 className="mt-3 font-bold text-gray-800 text-base">Bác sĩ {d.fullName}</h3>
                    {d.specialty && (
                      <span className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${c.bg} ${c.text}`}>
                        <FontAwesomeIcon icon={faStethoscope} className="text-[10px]" />
                        {d.specialty}
                      </span>
                    )}
                    {d.services?.length > 0 && (
                      <p className="mt-1 text-xs text-gray-400">{d.services.length} dịch vụ phụ trách</p>
                    )}
                  </div>

                  {/* Bio */}
                  {d.bio && (
                    <div className="px-5 pb-3">
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed text-center">{d.bio}</p>
                    </div>
                  )}

                  {/* Service pills */}
                  {d.services?.length > 0 && (
                    <div className="px-5 pb-4 flex flex-wrap justify-center gap-1.5">
                      {d.services.slice(0, 3).map((s) => (
                        <span key={s.id} className="text-xs bg-gray-50 text-gray-600 border border-gray-100 rounded-full px-2.5 py-0.5">
                          {s.name}
                        </span>
                      ))}
                      {d.services.length > 3 && (
                        <span className="text-xs bg-gray-50 text-gray-400 border border-gray-100 rounded-full px-2.5 py-0.5">
                          +{d.services.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto px-5 pb-5 pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
                    <Link
                      to={`/dashboard/doctors/${d.id}`}
                      className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-semibold transition-colors"
                    >
                      Xem hồ sơ
                      <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                    </Link>

                    {me?.role === "PATIENT" && d.services?.length > 0 ? (
                      <Link
                        to={`/booking?${bookingParams.toString()}`}
                        className="bg_button text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm"
                      >
                        <FontAwesomeIcon icon={faCalendarPlus} />
                        Đặt lịch
                      </Link>
                    ) : !me ? (
                      <Link
                        to="/login"
                        className="text-xs font-semibold text-green-600 hover:text-green-700 border border-green-200 bg-green-50 rounded-full px-4 py-2 transition-colors"
                      >
                        Đăng nhập
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer CTA ── */}
      {!isLoading && doctors.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-14">
          <div className="bg_main rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
            <div className="absolute -left-5 -bottom-5 w-32 h-32 rounded-full bg-white/10" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-white">
              <div>
                <p className="text-white/80 text-sm font-medium tracking-wide uppercase mb-2">Tư vấn chuyên khoa</p>
                <h2 className="text-2xl sm:text-3xl font-bold leading-snug">Không biết chọn bác sĩ nào?</h2>
                <p className="text-white/80 text-sm mt-2 max-w-md">
                  Gọi ngay cho chúng tôi để được tư vấn miễn phí và lựa chọn bác sĩ phù hợp nhất.
                </p>
              </div>
              <a href="tel:19001806" className="bg_button inline-flex items-center gap-2.5 px-8 py-3.5 font-bold text-sm whitespace-nowrap shadow-lg">
                📞 1900 1806
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
