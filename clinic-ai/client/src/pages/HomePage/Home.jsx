import Header from "./Content/Header";
import Footer from "./Content/Section9"; // Giả sử Section9 là Footer hoặc bạn có file Footer riêng
import AOS from "aos";
import "aos/dist/aos.css";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

export default function Home() {
  return (
    <div className="w-full font-latoV overflow-x-clip">
      <Header />
      <main>
        <Outlet />
      </main>
      {/* <Footer /> */}
    </div>
  );
}