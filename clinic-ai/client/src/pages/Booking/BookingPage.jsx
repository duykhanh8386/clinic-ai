import { useEffect, useMemo, useState } from "react";

function doctorCode(id) { return id ? id.slice(-8).toUpperCase() : ""; }
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "../../utils/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { listServices } from "../../services/service.service";
import { listSpecialties } from "../../services/specialty.service";
import { listDoctors } from "../../services/doctor.service";
import { listSlots, listSlotsByRange } from "../../services/slot.service";
import { createAppointment } from "../../services/appointment.service";
import { upsertPrevisit } from "../../services/previsit.service";
import { formatCurrency, formatDateTime, toDateInputValue } from "../../utils/booking";
import { CLINIC_SPECIALTIES } from "../../constants/specialties";

function toLocalDateKey(value) {
  const isDateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const dateValue = value instanceof Date ? value : new Date(isDateOnly ? `${value}T00:00:00` : value);
  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")}`;
}

function getWeekRange(dateKey) {
  const base = new Date(`${dateKey}T00:00:00`);
  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const from = new Date(base);
  from.setDate(base.getDate() + diffToMonday);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return {
    from: toLocalDateKey(from),
    to: toLocalDateKey(to),
  };
}

function maxDateKey(a, b) {
  return a > b ? a : b;
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Step 1 state
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get("specialty") || "");
  const [serviceId, setServiceId] = useState(searchParams.get("serviceId") || "");
  const [doctorId, setDoctorId] = useState(searchParams.get("doctorId") || "");
  const [date, setDate] = useState(searchParams.get("date") || toDateInputValue());
  const [reason, setReason] = useState(searchParams.get("reason") || "");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Step 2 state
  const [step, setStep] = useState(1);
  const [createdAppointmentId, setCreatedAppointmentId] = useState(null);
  const [previsitForm, setPrevisitForm] = useState({
    symptoms: "",
    durationDays: "0",
    fever: false,
    allergies: "",
    medicalHistory: "",
    currentMedications: "",
    notes: "",
  });

  // Queries
  const servicesQ = useQuery({
    queryKey: ["booking-services"],
    queryFn: () => listServices({ page: 1, limit: 50 }),
  });

  const specialtiesQ = useQuery({
    queryKey: ["booking-specialties"],
    queryFn: () => listSpecialties({ page: 1, limit: 100 }),
  });

  const doctorsQ = useQuery({
    queryKey: ["booking-doctors", serviceId, selectedSpecialty],
    queryFn: () =>
      listDoctors({
        page: 1,
        limit: 50,
        serviceId: serviceId || undefined,
        specialty: selectedSpecialty || undefined,
      }),
  });

  // Show available days for the whole week that contains the selected date.
  const hintRange = useMemo(() => {
    const today = toDateInputValue();
    const week = getWeekRange(date || today);
    return {
      from: maxDateKey(week.from, today),
      to: week.to,
    };
  }, [date]);
  const hintFrom = hintRange.from;
  const hintTo = hintRange.to;
  const doctorHintSlotsQ = useQuery({
    queryKey: ["doctor-hint-slots", doctorId, hintFrom, hintTo],
    enabled: Boolean(doctorId),
    queryFn: () =>
      listSlotsByRange({ doctorId, from: hintFrom, to: hintTo })
        .then((r) => r?.data ?? []),
  });
  // Dates that have at least one available slot
  const availableDates = useMemo(() => {
    const set = new Set();
    (doctorHintSlotsQ.data || [])
      .filter((s) => s.status === "AVAILABLE")
      .forEach((s) => { set.add(new Date(s.startAt).toISOString().slice(0, 10)); });
    return [...set].sort();
  }, [doctorHintSlotsQ.data]);

  const services = useMemo(() => servicesQ.data?.data ?? [], [servicesQ.data]);
  const doctors = useMemo(() => doctorsQ.data?.data ?? [], [doctorsQ.data]);
  const specialties = useMemo(() => {
    const names = (specialtiesQ.data?.data ?? []).map((item) => item.name).filter(Boolean);
    if (names.length) return names;
    const serviceNames = services.map((service) => service.specialty).filter(Boolean);
    return serviceNames.length ? [...new Set(serviceNames)].sort() : CLINIC_SPECIALTIES;
  }, [services, specialtiesQ.data]);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === doctorId),
    [doctors, doctorId]
  );

  // When a doctor is selected, only show services that doctor offers
  const displayedServices = useMemo(() => {
    let list = services;
    if (selectedSpecialty) {
      list = list.filter((service) => (service.specialty || "").trim() === selectedSpecialty);
    }
    if (doctorId && selectedDoctor?.services?.length) {
      const doctorServiceIds = new Set((selectedDoctor.services || []).map((service) => service.id));
      list = list.filter((service) => doctorServiceIds.has(service.id));
    }
    return list;
  }, [doctorId, selectedDoctor, services, selectedSpecialty]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [services, serviceId]
  );

  useEffect(() => {
    const inferredSpecialty =
      (selectedDoctor?.specialty || "").trim() ||
      (selectedService?.specialty || "").trim();

    if (inferredSpecialty && selectedSpecialty !== inferredSpecialty) {
      setSelectedSpecialty(inferredSpecialty);
    }
  }, [
    selectedDoctor?.id,
    selectedDoctor?.specialty,
    selectedService?.id,
    selectedService?.specialty,
    selectedSpecialty,
  ]);

  const slotsQ = useQuery({
    queryKey: ["booking-slots", doctorId, serviceId, date],
    enabled: Boolean(doctorId && serviceId && date),
    queryFn: () => listSlots({ doctorId, serviceId, date }),
  });

  const slots = useMemo(() => slotsQ.data?.data ?? [], [slotsQ.data]);
  const selectedSlot = useMemo(
    () =>
      slots.find(
        (slot) => slot.id === selectedSlotId && toLocalDateKey(slot.startAt) === date
      ),
    [date, selectedSlotId, slots]
  );

  useEffect(() => {
    if (selectedSlotId && !slotsQ.isLoading && !selectedSlot) {
      setSelectedSlotId("");
    }
  }, [selectedSlot, selectedSlotId, slotsQ.isLoading]);

  // Mutations
  const bookingMutation = useMutation({
    mutationFn: (payload) => createAppointment(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
      toast.success("Đặt lịch thành công! Vui lòng điền phiếu tiền khám.");
      const appointmentId = res?.data?.data?.id || res?.data?.id;
      setCreatedAppointmentId(appointmentId);
      setStep(2);
    },
    onError: (error) => {
      setSubmitError(
        error?.response?.data?.error?.message ||
          error?.message ||
          "Không thể đặt lịch vào lúc này."
      );
    },
  });

  const previsitMutation = useMutation({
    mutationFn: (payload) => upsertPrevisit(createdAppointmentId, payload),
    onSuccess: () => {
      toast.success("Đã lưu phiếu tiền khám!");
      navigate("/appointments", { replace: true });
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.error?.message ||
          error?.message ||
          "Không lưu được phiếu tiền khám."
      );
    },
  });

  // Handlers
  function handleSpecialtyChange(nextSpecialty) {
    setSelectedSpecialty(nextSpecialty);
    setServiceId("");
    setDoctorId("");
    setSelectedSlotId("");
    setSubmitError("");
  }

  function handleServiceChange(nextServiceId) {
    const nextService = services.find((service) => service.id === nextServiceId);
    setSelectedSpecialty((nextService?.specialty || "").trim());
    setServiceId(nextServiceId);
    setDoctorId("");
    setSelectedSlotId("");
    setSubmitError("");
  }

  function handleDoctorChange(nextDoctorId) {
    setSelectedSlotId("");
    setSubmitError("");
    const newDoctor = doctors.find((d) => d.id === nextDoctorId);
    if (newDoctor?.specialty) {
      setSelectedSpecialty(newDoctor.specialty.trim());
    }
    if (nextDoctorId && serviceId) {
      const doctorServiceIds = (newDoctor?.services || []).map((s) => s.id);
      if (!doctorServiceIds.includes(serviceId)) {
        setServiceId("");
      }
    }
    setDoctorId(nextDoctorId);
  }

  function handleDateChange(nextDate) {
    setDate(nextDate);
    setSelectedSlotId("");
    setSubmitError("");
  }

  function handleSlotToggle(slot, isPast) {
    if (isPast) return;
    setSubmitError("");
    setSelectedSlotId((current) => (current === slot.id ? "" : slot.id));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    if (!selectedSlot) {
      setSubmitError("Vui lòng chọn một slot trống trước khi đặt lịch.");
      return;
    }
    bookingMutation.mutate({ slotId: selectedSlot.id, reason: reason.trim() });
  }

  function handlePrevisitSubmit(e) {
    e.preventDefault();
    const splitTrim = (s) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    const symptoms = splitTrim(previsitForm.symptoms);
    if (symptoms.length === 0) {
      toast.error("Vui lòng điền ít nhất 1 triệu chứng để lưu phiếu tiền khám.");
      return;
    }
    previsitMutation.mutate({
      formData: {
        symptoms,
        durationDays: parseInt(previsitForm.durationDays, 10) || 0,
        fever: previsitForm.fever,
        allergies: splitTrim(previsitForm.allergies),
        medicalHistory: splitTrim(previsitForm.medicalHistory),
        currentMedications: splitTrim(previsitForm.currentMedications),
        notes: previsitForm.notes,
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 font-latoV">

      {/* ── Top hero / step bar ── */}
      <div className="bg_main px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {step === 1 ? "Đặt lịch khám" : "Phiếu tiền khám"}
              </h1>
              <p className="mt-1 text-white/80 text-sm">
                {step === 1
                  ? "Chọn dịch vụ, bác sĩ, ngày khám và khung giờ phù hợp."
                  : "Điền thông tin triệu chứng để bác sĩ chuẩn bị trước khi gặp bạn."}
              </p>
            </div>
            {step === 1 && (
              <Link
                to="/appointments"
                className="bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-5 py-2 rounded-full inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <FontAwesomeIcon icon={faCalendarDays} />
                Lịch hẹn của tôi
              </Link>
            )}
          </div>

          {/* Step progress */}
          <div className="mt-6 flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              step === 1 ? "bg-white text-green-600" : "bg-white/20 text-white"
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 1 ? "bg-green-500 text-white" : "bg-green-400 text-white"
              }`}>1</span>
              Chọn lịch khám
            </div>
            <div className="flex-1 h-0.5 bg-white/30 max-w-12" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              step === 2 ? "bg-white text-green-600" : "bg-white/20 text-white"
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 2 ? "bg-green-500 text-white" : "bg-white/40 text-white"
              }`}>2</span>
              Phiếu tiền khám
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ══════════════════ STEP 2: Pre-visit form ══════════════════ */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="mb-6 flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <FontAwesomeIcon icon={faCircleCheck} className="text-green-500 mt-0.5 shrink-0" />
                <p className="text-sm text-green-700 font-medium">
                  Đặt lịch thành công! Hãy điền phiếu tiền khám để bác sĩ chuẩn bị tốt hơn.
                </p>
              </div>

              <form onSubmit={handlePrevisitSubmit} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Triệu chứng <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                    placeholder="Ví dụ: đau họng, ho khan, sốt... (cách nhau bằng dấu phẩy)"
                    value={previsitForm.symptoms}
                    onChange={(e) => setPrevisitForm((f) => ({ ...f, symptoms: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Số ngày bị bệnh</label>
                    <input
                      type="number"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                      min={0}
                      max={365}
                      value={previsitForm.durationDays}
                      onChange={(e) => setPrevisitForm((f) => ({ ...f, durationDays: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-green-300 transition-colors">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm"
                        id="fever-check"
                        checked={previsitForm.fever}
                        onChange={(e) => setPrevisitForm((f) => ({ ...f, fever: e.target.checked }))}
                      />
                      <span className="text-sm font-medium text-gray-700">Có sốt</span>
                    </label>
                  </div>
                </div>

                {[
                  { key: "allergies", label: "Dị ứng", placeholder: "Ví dụ: penicillin, hải sản... (cách nhau bằng dấu phẩy)" },
                  { key: "medicalHistory", label: "Tiền sử bệnh", placeholder: "Ví dụ: tiểu đường, huyết áp cao... (cách nhau bằng dấu phẩy)" },
                  { key: "currentMedications", label: "Thuốc đang dùng", placeholder: "Ví dụ: metformin 500mg... (cách nhau bằng dấu phẩy)" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                      placeholder={placeholder}
                      value={previsitForm[key]}
                      onChange={(e) => setPrevisitForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Ghi chú thêm</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all min-h-28 resize-none"
                    placeholder="Thông tin bổ sung bạn muốn bác sĩ biết..."
                    maxLength={2000}
                    value={previsitForm.notes}
                    onChange={(e) => setPrevisitForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg_button text-white font-bold py-3 px-6 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                    disabled={previsitMutation.isPending || !previsitForm.symptoms.trim()}
                  >
                    {previsitMutation.isPending ? "Đang lưu..." : "Lưu phiếu tiền khám"}
                  </button>
                  <button
                    type="button"
                    className="px-6 py-3 border border-gray-200 rounded-full text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                    onClick={() => navigate("/appointments", { replace: true })}
                  >
                    Bỏ qua
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 1: Booking form ══════════════════ */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">

            {/* ─ Left: form ─ */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50">
                <h2 className="text-base font-bold text-gray-800">Thông tin đặt lịch</h2>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Chuyên khoa
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all bg-white appearance-none cursor-pointer disabled:opacity-60"
                    value={selectedSpecialty}
                    onChange={(event) => handleSpecialtyChange(event.target.value)}
                    disabled={servicesQ.isLoading}
                  >
                    <option value="">-- Tất cả chuyên khoa --</option>
                    {specialties.map((specialty) => (
                      <option key={specialty} value={specialty}>
                        {specialty}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service select */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Dịch vụ khám <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all bg-white appearance-none cursor-pointer disabled:opacity-60"
                    value={serviceId}
                    onChange={(event) => handleServiceChange(event.target.value)}
                    disabled={servicesQ.isLoading}
                  >
                    <option value="">-- Chọn dịch vụ --</option>
                    {displayedServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Doctor select */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Bác sĩ <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all bg-white appearance-none cursor-pointer disabled:opacity-60"
                    value={doctorId}
                    onChange={(event) => handleDoctorChange(event.target.value)}
                    disabled={doctorsQ.isLoading}
                  >
                    <option value="">-- Chọn bác sĩ --</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.fullName} — #{doctorCode(doctor.id)} ({doctor.specialty})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mobile: Available dates + slots (between doctor and date) */}
                <div className="xl:hidden space-y-4">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg_main px-4 py-4">
                      <h2 className="text-base font-bold text-white">Ngày có lịch trống</h2>
                      {!doctorId ? (
                        <p className="mt-1 text-sm text-white/80">Chọn bác sĩ để xem ngày còn slot trống.</p>
                      ) : doctorHintSlotsQ.isLoading ? (
                        <p className="mt-1 text-sm text-white/80">Đang tải lịch...</p>
                      ) : availableDates.length === 0 ? (
                        <p className="mt-1 text-sm text-white/80">Không có slot trống trong 2 tuần tới.</p>
                      ) : (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {availableDates.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleDateChange(d)}
                              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                                date === d
                                  ? "bg-white text-green-600 shadow-sm"
                                  : "bg-white/20 text-white hover:bg-white/30"
                              }`}
                            >
                              {new Date(d + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-gray-800">Khung giờ khám</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Chọn bác sĩ, dịch vụ và ngày để hiển thị slot khả dụng</p>
                      </div>
                      {slots.length > 0 && (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                          {slots.length} slot
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      {!doctorId || !serviceId ? (
                        <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                          <p className="text-sm text-gray-500">Hãy chọn đủ dịch vụ và bác sĩ để hiển thị slot.</p>
                        </div>
                      ) : slotsQ.isLoading ? (
                        <div className="grid grid-cols-2 gap-3">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                          ))}
                        </div>
                      ) : slotsQ.error ? (
                        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
                          {slotsQ.error?.response?.data?.error?.message || "Không tải được slot."}
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                          <p className="text-sm text-gray-500">Không có slot trống cho ngày này.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {slots.map((slot) => {
                            const selected = selectedSlotId === slot.id;
                            const isPast = new Date(slot.startAt) <= new Date();
                            const startTime = new Date(slot.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                            const endTime = new Date(slot.endAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                            return (
                              <button
                                type="button"
                                key={slot.id}
                                onClick={() => handleSlotToggle(slot, isPast)}
                                disabled={isPast}
                                className={`rounded-xl border-2 p-3 text-center transition-all duration-200 flex flex-col items-center gap-1 ${
                                  isPast
                                    ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-40"
                                    : selected
                                    ? "border-green-400 bg-green-50 shadow-md scale-[1.02]"
                                    : "border-gray-200 hover:border-green-300 hover:bg-green-50/50 hover:scale-[1.01]"
                                }`}
                              >
                                <div className={`text-base font-bold ${selected ? "text-green-600" : isPast ? "text-gray-400" : "text-gray-700"}`}>
                                  {startTime}
                                </div>
                                <div className="text-xs text-gray-400">đến {endTime}</div>
                                <div className={`mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                  isPast ? "bg-gray-100 text-gray-400" :
                                  selected ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
                                }`}>
                                  {isPast ? "Hết hạn" : selected ? "Đã chọn ✓" : "Còn trống"}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Ngày khám <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                    value={date}
                    onChange={(event) => handleDateChange(event.target.value)}
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Lý do khám <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all min-h-28 resize-none"
                    placeholder="Ví dụ: Đau họng 3 ngày, nuốt đau, sốt nhẹ..."
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    minLength={3}
                    required
                  />
                </div>
              </div>

              {/* Summary card */}
              <div className="mx-6 mb-5 rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm space-y-2">
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-3">Tóm tắt lịch hẹn</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Dịch vụ</span>
                  <span className="font-medium text-gray-800 text-right">{selectedService?.name || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Bác sĩ</span>
                  <span className="font-medium text-gray-800 text-right">
                    {selectedDoctor ? `BS. ${selectedDoctor.fullName}` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Ngày khám</span>
                  <span className="font-medium text-gray-800">{date || "—"}</span>
                </div>
                {selectedSlot && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">Giờ khám</span>
                    <span className="font-medium text-green-600">
                      {formatDateTime(selectedSlot.startAt)}
                    </span>
                  </div>
                )}
                {selectedService?.price && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-500">Chi phí dự kiến</span>
                    <span className="font-bold text-orange-500">{formatCurrency(selectedService.price)}</span>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="mx-6 mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  ⚠️ {submitError}
                </div>
              )}

              <div className="px-6 pb-6">
                <button
                  type="submit"
                  className="w-full bg_button text-white font-bold py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                  disabled={bookingMutation.isPending || !selectedSlot || reason.trim().length < 3}
                >
                  {bookingMutation.isPending ? "Đang đặt lịch..." : "✓ Xác nhận đặt lịch"}
                </button>
              </div>
            </form>

            {/* ─ Right: date hints + slots ─ */}
            <div className="hidden xl:block space-y-5">

              {/* Available dates */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg_main px-6 py-4">
                  <h2 className="text-base font-bold text-white">📅 Ngày có lịch trống</h2>
                  {!doctorId ? (
                    <p className="mt-1 text-sm text-white/80">Chọn bác sĩ để xem ngày còn slot trống.</p>
                  ) : doctorHintSlotsQ.isLoading ? (
                    <p className="mt-1 text-sm text-white/80">Đang tải lịch...</p>
                  ) : availableDates.length === 0 ? (
                    <p className="mt-1 text-sm text-white/80">Không có slot trống trong 2 tuần tới.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {availableDates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleDateChange(d)}
                          className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all ${
                            date === d
                              ? "bg-white text-green-600 shadow-sm"
                              : "bg-white/20 text-white hover:bg-white/30"
                          }`}
                        >
                          {new Date(d + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Slots */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-800">🕐 Khung giờ khám</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Chọn bác sĩ, dịch vụ và ngày để hiển thị slot khả dụng</p>
                  </div>
                  {slots.length > 0 && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                      {slots.length} slot
                    </span>
                  )}
                </div>

                <div className="p-5">
                  {!doctorId || !serviceId ? (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                      <div className="text-3xl mb-2">📋</div>
                      <p className="text-sm text-gray-500">Hãy chọn đủ dịch vụ và bác sĩ để hiển thị slot.</p>
                    </div>
                  ) : slotsQ.isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                      ))}
                    </div>
                  ) : slotsQ.error ? (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
                      {slotsQ.error?.response?.data?.error?.message || "Không tải được slot."}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                      <div className="text-3xl mb-2">😔</div>
                      <p className="text-sm text-gray-500">Không có slot trống cho ngày này.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {slots.map((slot) => {
                        const selected = selectedSlotId === slot.id;
                        const isPast = new Date(slot.startAt) <= new Date();
                        const startTime = new Date(slot.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                        const endTime = new Date(slot.endAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                        return (
                          <button
                            type="button"
                            key={slot.id}
                            onClick={() => handleSlotToggle(slot, isPast)}
                            disabled={isPast}
                            className={`rounded-xl border-2 p-3 text-center transition-all duration-200 flex flex-col items-center gap-1 ${
                              isPast
                                ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-40"
                                : selected
                                ? "border-green-400 bg-green-50 shadow-md scale-[1.02]"
                                : "border-gray-200 hover:border-green-300 hover:bg-green-50/50 hover:scale-[1.01]"
                            }`}
                          >
                            <div className={`text-base font-bold ${selected ? "text-green-600" : isPast ? "text-gray-400" : "text-gray-700"}`}>
                              {startTime}
                            </div>
                            <div className="text-xs text-gray-400">đến {endTime}</div>
                            <div className={`mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              isPast ? "bg-gray-100 text-gray-400" :
                              selected ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
                            }`}>
                              {isPast ? "Hết hạn" : selected ? "Đã chọn ✓" : "Còn trống"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected service info */}
              {selectedService && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h2 className="text-base font-bold text-gray-800">Dịch vụ đã chọn</h2>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-xl shrink-0">🩺</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{selectedService.name}</p>
                        {selectedService.specialty && (
                          <span className="inline-block mt-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                            {selectedService.specialty}
                          </span>
                        )}
                        {selectedService.description && (
                          <p className="mt-2 text-sm text-gray-500 line-clamp-2">{selectedService.description}</p>
                        )}
                        <div className="mt-3 flex gap-3">
                          <span className="text-sm font-bold text-orange-500">{formatCurrency(selectedService.price)}</span>
                          <span className="text-sm text-gray-400">•</span>
                          <span className="text-sm text-gray-500">{selectedService.durationMinutes} phút</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
