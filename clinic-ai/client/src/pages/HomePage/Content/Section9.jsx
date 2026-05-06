import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "../../../utils/toast";
import Bg from "../../../assets/Section9/Bg.jpg";
import Robot from "../../../assets/Section9/Robot.png";
import Lich from "../../../assets/Section9/Lich.png"

function Section9() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    message: "",
    isHuman: false,
  });
  const defaultForm = {
    name: "",
    email: "",
    phone: "",
    date: "",
    message: "",
    isHuman: false,
  };
  
  const dateInputRef = useRef(null);
  const handleDateIconClick = () => {
    if (dateInputRef.current?.showPicker) {
      dateInputRef.current.showPicker();
    } else {
      dateInputRef.current.focus();
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(form.phone)) {
      toast.error("Số điện thoại không hợp lệ.");
      return;
    } else {
      toast.success("Đăng ký tư vấn thành công! Chúng tôi sẽ liên hệ lại sớm.");
      setForm(defaultForm);
      if(openModal) close();
    }
  };

  const [openModal, setOpenModal] = useState(false);
  const handleOpenModal = () => {
    setOpenModal(true);
    document.body.style.overflow = 'hidden';
  }
  const close = () => {
    setOpenModal(false);
    document.body.style.overflow = 'unset';
  }

  return (
    <>
      <div style={{ backgroundImage: `url(${Bg})` }} className="w-full xl:py-[2%] min-h-[100px] mb4:min-h-[170px] sm:min-h-[220px] 4k:py-[5%] lg:py-[1.5%] md:py-[3%] bg-cover flex items-center justify-items-start lg:mt-[0%] ">
        <div className="4k:w-[37.5%] sm:w-[40%] h-full relative z-[1] 4k:ml-[12.5%] sm:ml-[10%] ml-[2.5%]">
          <form
            onSubmit={handleSubmit}
            className="bg-white mx-auto rounded-[15px] shadow-xl overflow-hidden border border-gray-200"
          >
            <div className="bg-gradient-to-r from-green-400 to-blue-400 mb4:px-6 mb4:py-4 px-3 py-2 pb-0 lg:pb-2 text-left">
              <h2 className="text-white text-sm font-bold">Đăng ký tư vấn miễn phí</h2>
              <p className="text-white text-sm xl:block lg:hidden sm:block hidden">
                Đặt hẹn ngay để nhận tư vấn và chúng tôi sẽ xếp lịch khám kịp thời!
              </p>
            </div>
            
            <div className="lg:hidden mb4:p-2 p-1.5 flex items-center justify-center bg-white" onClick={handleOpenModal}>
              <div className="bg-gradient-to-r rounded-full p-[2px] from-green-400 to-blue-400">
                <button
                  type="button"
                  className="bg-white hover:bg-gradient-to-r hover:from-green-400 hover:to-blue-400 text-[14px] font-semibold mb4:py-2 mb4:px-6 px-3 py-1 rounded-full hover:opacity-90 transition-all"
                >
                  <h2 className="bg-gradient-to-r text-[12px] from-green-400 to-blue-400 text-transparent bg-clip-text hover:text-white">GỬI YÊU CẦU</h2>
                </button>
              </div>
            </div>

            <div className="px-[3%] lg:block hidden py-[3%] text-left">
              <div className="grid mt-[1%] sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Họ và tên*"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded 2xl:px-3 2xl:py-2 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  required
                />
                <textarea
                  name="message"
                  placeholder="Nhập nội dung"
                  value={form.message}
                  onChange={handleChange}
                  className="w-full border border-gray-300 h-full rounded 2xl:px-3 2xl:py-2 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 row-span-2"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded 2xl:px-3 2xl:py-2 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-[15px]">
                <input
                  type="number"
                  name="phone"
                  placeholder="Số điện thoại*"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded 2xl:px-3 2xl:py-2 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  required
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isHuman"
                    checked={form.isHuman}
                    onChange={handleChange}
                    className="p-1"
                    required
                  />
                  <span className="text-sm">Tôi không phải người máy</span>
                  <img src={Robot} alt="robot" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-[15px] items-center">
                <div className="relative">
                  <input
                    type="text"
                    ref={dateInputRef}
                    onFocus={(e) => (e.target.type = 'date')}
                    onBlur={(e) => (e.target.type = 'text')}
                    name="date"
                    placeholder="Ngày đặt"
                    value={form.date}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded 2xl:px-3 2xl:py-2 px-2 py-1.5 appearance-none"
                  />
                  <button
                    type="button"
                    onClick={handleDateIconClick}
                    className="absolute z-[1] cursor-pointer right-[2%] top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500"
                  >
                    <img src={Lich} alt="" />
                  </button>
                </div>
                <button
                  type="submit"
                  className="bg-gradient-to-r w-full cursor-pointer from-green-400 to-blue-400 text-white font-semibold py-2 px-6 rounded-full hover:opacity-90 transition-all"
                >
                  GỬI YÊU CẦU
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {openModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          ></div>

          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all
                 duration-300 ease-out scale-100 ${!openModal ? 'animate-[fadeOut_0.3s_ease-in]' : 'animate-[scaleIn_0.3s_ease-out]'}`}>
            <button
              onClick={close}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/20 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-2xl shadow-lg transition-all"
            >
              ×
            </button>
            
            <form onSubmit={handleSubmit} className="text-left">
              <div className="bg-gradient-to-r from-green-400 to-blue-400 p-8 pt-10">
                <h2 className="text-white text-2xl font-bold">Đăng ký tư vấn miễn phí</h2>
                <p className="text-white/90 mt-2">
                  Đặt hẹn ngay để nhận tư vấn và chúng tôi sẽ xếp lịch khám kịp thời!
                </p>
              </div>

              <div className="p-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="name"
                    placeholder="Họ và tên*"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                  <input
                    type="number"
                    name="phone"
                    placeholder="Số điện thoại*"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                </div>
                
                <input
                  type="email"
                  name="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />

                <textarea
                  name="message"
                  placeholder="Nhập nội dung"
                  value={form.message}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-100 outline-none h-24"
                />

                <div className="flex items-center justify-between gap-4">
                   <div className="relative flex-1">
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input type="checkbox" required className="w-5 h-5 rounded border-gray-300" />
                    <img src={Robot} alt="robot" className="w-6" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-400 to-blue-400 text-white font-bold py-4 rounded-lg shadow-lg hover:opacity-90 transition-opacity mt-2"
                >
                  GỬI YÊU CẦU
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default Section9;