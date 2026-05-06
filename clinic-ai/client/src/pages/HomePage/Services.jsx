import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listServices } from "../../services/service.service";
import { listSpecialties } from "../../services/specialty.service";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faClock,
  faTag,
  faStethoscope,
  faCalendarPlus,
  faEye,
  faTooth,
  faLungs,
  faBrain,
  faBone,
  faHeart,
  faSyringe,
  faMicroscope,
  faXRay,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { useBootAuth } from "../../context/useBootAuth";

const SPECIALTY_FALLBACK_NAME = "Chưa phân chuyên khoa";

function formatVnd(n) {
  if (n == null || Number.isNaN(Number(n))) return "-";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function specialtyKey(name) {
  return normalizeText(name).toLocaleLowerCase("vi-VN") || "__none__";
}

function serviceMatchesSearch(service, query) {
  const fields = [service.name, service.description, service.specialty];
  return fields.some((field) =>
    normalizeText(field).toLocaleLowerCase("vi-VN").includes(query)
  );
}

const SERVICE_FA_ICONS = [
  faEye,
  faTooth,
  faLungs,
  faBrain,
  faBone,
  faHeart,
  faStethoscope,
  faSyringe,
  faMicroscope,
  faXRay,
];
const SERVICE_COLORS = [
  { bg: "bg-blue-50", text: "text-blue-500", border: "border-blue-100" },
  { bg: "bg-teal-50", text: "text-teal-500", border: "border-teal-100" },
  { bg: "bg-purple-50", text: "text-purple-500", border: "border-purple-100" },
  { bg: "bg-rose-50", text: "text-rose-500", border: "border-rose-100" },
  { bg: "bg-amber-50", text: "text-amber-500", border: "border-amber-100" },
  { bg: "bg-green-50", text: "text-green-500", border: "border-green-100" },
  { bg: "bg-indigo-50", text: "text-indigo-500", border: "border-indigo-100" },
  { bg: "bg-cyan-50", text: "text-cyan-500", border: "border-cyan-100" },
  { bg: "bg-orange-50", text: "text-orange-500", border: "border-orange-100" },
  { bg: "bg-pink-50", text: "text-pink-500", border: "border-pink-100" },
];

function ServiceCard({ service, index, me }) {
  const color = SERVICE_COLORS[index % SERVICE_COLORS.length];
  const icon = SERVICE_FA_ICONS[index % SERVICE_FA_ICONS.length];
  const bookingParams = new URLSearchParams({ serviceId: service.id });
  if (service.specialty) bookingParams.set("specialty", service.specialty);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col">
      <div className="h-1 bg_main" />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl ${color.bg} ${color.border} border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
            <FontAwesomeIcon icon={icon} className={`text-xl ${color.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2">
              {service.name}
            </h3>
            {service.specialty && (
              <span className={`inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                {service.specialty}
              </span>
            )}
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-500 line-clamp-3 leading-relaxed flex-1">
          {service.description ||
            "Dịch vụ khám chuyên khoa tại phòng khám, được thực hiện bởi đội ngũ bác sĩ giàu kinh nghiệm."}
        </p>

        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <FontAwesomeIcon icon={faClock} className="text-gray-400" />
              <span>{service.durationMinutes} phút</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faTag} className="text-orange-400 text-xs" />
              <span className="font-bold text-gray-800 text-base">{formatVnd(service.price)}</span>
            </div>
          </div>

          {me?.role === "PATIENT" ? (
            <Link
              to={`/booking?${bookingParams.toString()}`}
              className="bg_button text-white text-xs font-bold px-5 py-2.5 flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <FontAwesomeIcon icon={faCalendarPlus} />
              Đặt lịch
            </Link>
          ) : (
            <Link
              to="/login"
              className="text-xs font-semibold text-green-600 hover:text-green-700 border border-green-200 bg-green-50 rounded-full px-4 py-2 transition-colors shrink-0"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Services() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const { me } = useBootAuth();

  const servicesQ = useQuery({
    queryKey: ["services"],
    queryFn: () => listServices({ page: 1, limit: 200 }),
  });

  const specialtiesQ = useQuery({
    queryKey: ["service-specialties"],
    queryFn: () => listSpecialties({ page: 1, limit: 100 }),
  });

  const allServices = useMemo(() => servicesQ.data?.data ?? [], [servicesQ.data]);
  const allSpecialties = useMemo(() => specialtiesQ.data?.data ?? [], [specialtiesQ.data]);
  const specialtyCatalog = useMemo(() => {
    const map = new Map();

    allSpecialties.forEach((item) => {
      const name = normalizeText(item.name);
      if (!name) return;
      map.set(specialtyKey(name), {
        key: specialtyKey(name),
        id: item.id,
        name,
        description: item.description || "",
      });
    });

    allServices.forEach((service) => {
      const name = normalizeText(service.specialty) || SPECIALTY_FALLBACK_NAME;
      const key = specialtyKey(name);
      if (!map.has(key)) {
        map.set(key, { key, id: key, name, description: "" });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "vi-VN")
    );
  }, [allServices, allSpecialties]);

  const servicesBySpecialty = useMemo(() => {
    const map = new Map();
    allServices.forEach((service) => {
      const name = normalizeText(service.specialty) || SPECIALTY_FALLBACK_NAME;
      const key = specialtyKey(name);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(service);
    });
    return map;
  }, [allServices]);

  const visibleGroups = useMemo(() => {
    const query = normalizeText(search).toLocaleLowerCase("vi-VN");

    return specialtyCatalog
      .map((item) => {
        const groupServices = servicesBySpecialty.get(item.key) || [];
        const specialtyMatches = query
          ? item.name.toLocaleLowerCase("vi-VN").includes(query)
          : false;
        const visibleServices =
          query && !specialtyMatches
            ? groupServices.filter((service) => serviceMatchesSearch(service, query))
            : groupServices;

        return { ...item, services: visibleServices };
      })
      .filter((group) => {
        if (specialty && group.name !== specialty) return false;
        if (!query) return true;
        return (
          group.name.toLocaleLowerCase("vi-VN").includes(query) ||
          group.services.length > 0
        );
      });
  }, [search, servicesBySpecialty, specialty, specialtyCatalog]);

  const isLoading = servicesQ.isLoading || specialtiesQ.isLoading;
  const error = servicesQ.error || specialtiesQ.error;
  const visibleServiceCount = visibleGroups.reduce(
    (total, group) => total + group.services.length,
    0
  );

  return (
    <div className="font-latoV min-h-screen bg-gray-50">
      <div className="bg_main relative overflow-hidden py-16 px-4">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4">
                <FontAwesomeIcon icon={faStethoscope} className="text-white text-sm" />
                <span className="text-white font-medium text-sm tracking-wide">Hệ thống dịch vụ y tế</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                Dịch vụ <br className="hidden sm:block" />
                <span className="text-white/90">khám chữa bệnh</span>
              </h1>
              <p className="mt-4 text-white/80 text-base max-w-lg leading-relaxed">
                Đa dạng dịch vụ chuyên khoa, được thực hiện bởi đội ngũ bác sĩ giàu kinh nghiệm với trang thiết bị hiện đại.
              </p>
            </div>
            {(allServices.length > 0 || specialtyCatalog.length > 0) && (
              <div className="flex gap-4 shrink-0">
                <div className="bg-white/20 backdrop-blur rounded-2xl px-6 py-4 text-center text-white">
                  <div className="text-4xl font-bold">{allServices.length}</div>
                  <div className="text-sm text-white/80 mt-1">dịch vụ</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-2xl px-6 py-4 text-center text-white">
                  <div className="text-4xl font-bold">{specialtyCatalog.length}</div>
                  <div className="text-sm text-white/80 mt-1">chuyên khoa</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="py-3 flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-sm shrink-0" />
              <input
                className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent min-w-0"
                placeholder="Tìm theo tên dịch vụ hoặc chuyên khoa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <FontAwesomeIcon icon={faTimesCircle} className="text-sm" />
                </button>
              )}
            </div>
            {visibleGroups.length > 0 && (
              <span className="shrink-0 text-sm text-gray-500 font-medium whitespace-nowrap">
                {visibleServiceCount > 0
                  ? `${visibleServiceCount} dịch vụ`
                  : `${visibleGroups.length} chuyên khoa`}
              </span>
            )}
          </div>

          {specialtyCatalog.length > 0 && (
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
              {specialtyCatalog.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSpecialty(item.name === specialty ? "" : item.name)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    specialty === item.name
                      ? "bg_main text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="font-semibold text-red-500">Không tải được dữ liệu. Vui lòng thử lại.</p>
          </div>
        )}

        {!isLoading && !error && visibleGroups.length === 0 && (
          <div className="text-center py-24 text-gray-400">
            <p className="font-semibold text-xl">Không tìm thấy dịch vụ hoặc chuyên khoa nào</p>
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

        {!isLoading && !error && visibleGroups.length > 0 && (
          <div className="space-y-8">
            {visibleGroups.map((group, groupIndex) => (
              <section key={group.key} className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{group.name}</h2>
                    {group.description && (
                      <p className="mt-1 max-w-3xl text-sm text-gray-500">{group.description}</p>
                    )}
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    group.services.length
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {group.services.length ? `${group.services.length} dịch vụ` : "Không có dịch vụ"}
                  </span>
                </div>

                {group.services.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {group.services.map((service, serviceIndex) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        index={groupIndex + serviceIndex}
                        me={me}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center text-sm font-medium text-gray-400">
                    Không có dịch vụ
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      {!isLoading && !error && allServices.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-14">
          <div className="bg_main rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-white">
              <div>
                <p className="text-white/80 text-sm font-medium tracking-wide uppercase mb-2">Hỗ trợ 24/7</p>
                <h2 className="text-2xl sm:text-3xl font-bold leading-snug">Cần tư vấn về dịch vụ?</h2>
                <p className="text-white/80 text-sm mt-2 max-w-md">
                  Đội ngũ chuyên gia của chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc và hỗ trợ bạn lựa chọn dịch vụ phù hợp.
                </p>
              </div>
              <a href="tel:19001806" className="bg_button inline-flex items-center gap-2.5 px-8 py-3.5 font-bold text-sm whitespace-nowrap shadow-lg">
                1900 1806
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
