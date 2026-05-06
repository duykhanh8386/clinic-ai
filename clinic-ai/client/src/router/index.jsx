import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import RequireRole from "../components/auth/RequireRole";

import Home from "../pages/HomePage/Home";
import HomeContent from "../pages/HomePage/HomeContent";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import VerifyEmail from "../pages/Auth/VerifyEmail";
import ForgotPassword from "../pages/Auth/ForgotPassword";

import Services from "../pages/HomePage/Services";
import Doctors from "../pages/HomePage/Doctors";
import DoctorDetail from "../pages/Doctor/DoctorDetail";

// Doctor sidebar layout + pages
import DoctorLayout from "../pages/Doctor/DoctorLayout";
import DoctorHome from "../pages/Doctor/DoctorHome";
import DoctorAppointments from "../pages/Doctor/DoctorAppointments";
import DoctorSchedule from "../pages/Doctor/DoctorSchedule";
import DoctorProfile from "../pages/Doctor/DoctorProfile";

// Patient pages (use homepage Header)
import PatientAppointments from "../pages/Paitent/PatientAppointments";
import PatientProfile from "../pages/Paitent/PatientProfile";
import BookingPage from "../pages/Booking/BookingPage";

// Admin sidebar layout + pages
import AdminLayout from "../pages/Admin/AdminLayout";
import AdminHome from "../pages/Admin/AdminHome";
import AdminSpecialties from "../pages/Admin/AdminSpecialties";
import AdminServices from "../pages/Admin/AdminServices";
import AdminDoctors from "../pages/Admin/AdminDoctors";
import AdminSlots from "../pages/Admin/AdminSlots";
import AdminAppointments from "../pages/Admin/AdminAppointments";
import AdminKb from "../pages/Admin/AdminKb";
import AdminUsers from "../pages/Admin/AdminUsers";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <Home />,
        children: [
          { index: true, element: <HomeContent /> },
          // Patient pages — hiển trong homepage layout (với Header landing page)
          {
            element: <RequireRole roles={["PATIENT"]} />,
            children: [
              { path: "booking", element: <BookingPage /> },
              { path: "appointments", element: <PatientAppointments /> },
              { path: "profile", element: <PatientProfile /> },
            ],
          },
          // Public pages — dùng chung Header trang chủ
          { path: "dashboard/services", element: <Services /> },
          { path: "dashboard/doctors", element: <Doctors /> },
          { path: "dashboard/doctors/:id", element: <DoctorDetail /> },
        ],
      },

      // ── Doctor ──
      {
        path: "dashboard/doctor",
        element: <RequireRole roles={["DOCTOR"]} />,
        children: [
          {
            element: <DoctorLayout />,
            children: [
              { index: true, element: <DoctorHome /> },
              { path: "appointments", element: <DoctorAppointments /> },
              { path: "schedule", element: <DoctorSchedule /> },
              { path: "profile", element: <DoctorProfile /> },
            ],
          },
        ],
      },

      // ── Admin ──
      {
        path: "dashboard/admin",
        element: <RequireRole roles={["ADMIN"]} />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminHome /> },
              { path: "specialties", element: <AdminSpecialties /> },
              { path: "services", element: <AdminServices /> },
              { path: "doctors", element: <AdminDoctors /> },
              { path: "slots", element: <AdminSlots /> },
              { path: "appointments", element: <AdminAppointments /> },
              { path: "kb", element: <AdminKb /> },
              { path: "users", element: <AdminUsers /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "login", element: <Login /> },
  { path: "register", element: <Register /> },
  { path: "verify-email", element: <VerifyEmail /> },
  { path: "forgot-password", element: <ForgotPassword /> },
]);
