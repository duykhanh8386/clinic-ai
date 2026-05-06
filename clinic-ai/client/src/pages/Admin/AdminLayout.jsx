import DashboardLayout from "../../components/layout/DashboardLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh, faStethoscope, faUserDoctor,
  faCalendarDays, faCalendarCheck, faBook, faUsers, faTags,
} from "@fortawesome/free-solid-svg-icons";

export default function AdminLayout() {
  const navItems = [
    { label: "Tổng quan",     to: "/dashboard/admin",              end: true, icon: <FontAwesomeIcon icon={faGaugeHigh} /> },
    { label: "Chuyên khoa",     to: "/dashboard/admin/specialties",           icon: <FontAwesomeIcon icon={faTags} /> },
    { label: "Dịch vụ",       to: "/dashboard/admin/services",             icon: <FontAwesomeIcon icon={faStethoscope} /> },
    { label: "Bác sĩ",         to: "/dashboard/admin/doctors",              icon: <FontAwesomeIcon icon={faUserDoctor} /> },
    { label: "Lịch & Slot",   to: "/dashboard/admin/slots",                icon: <FontAwesomeIcon icon={faCalendarDays} /> },
    { label: "Lịch hẹn",       to: "/dashboard/admin/appointments",         icon: <FontAwesomeIcon icon={faCalendarCheck} /> },
    { label: "Knowledge Base", to: "/dashboard/admin/kb",               icon: <FontAwesomeIcon icon={faBook} /> },
    { label: "Tài khoản",       to: "/dashboard/admin/users",             icon: <FontAwesomeIcon icon={faUsers} /> },
  ];
  return <DashboardLayout navItems={navItems} title="Admin" />;
}
