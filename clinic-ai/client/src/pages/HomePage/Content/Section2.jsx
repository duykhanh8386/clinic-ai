import { useState } from "react";
import { createPortal } from "react-dom";
import DangKy from "../../../assets/Section2/DangKy.png";

function Section2() {
  const [openModal, setOpenModal] = useState(false);
  
  const open = () => {
    setOpenModal(true);
    document.body.style.overflow = 'hidden';
  }
  
  const close = () => {
    setOpenModal(false);
    document.body.style.overflow = 'unset';
  }

  return (
    <>
      <div className="4k:max-w-[75%] md:max-w-[80%] max-w-[95%] relative mx-auto">
        <div className="relative">
          <div className="md:mt-[10%] mt-5 relative">
            <div style={{
              WebkitTextStroke: "1px ",
            }} className="absolute bg_main text-transparent bg-clip-text font-black text-4xl right-[-10%] z-0">+</div>
            
            <div className="grid relative z-[1] md:grid-cols-2 grid-cols-1 gap-[3%] ">
              <div className="col-span-1">
                <div className=" text-lg lg:text-xl xl:text-[22px] 2xl:text-4xl 4k:text-[40px] font-bold">Tầm quan trọng của việc sử dụng kính Ortho-K</div>
              </div>
              <div className="col-span-1">
                <div className="text-gray-600 sm:pt-2.5 pt-0 opacity-60 text-justify 2xl:text-lg xl:text-lg lg:text-base text-[14px]">
                  Ortho-K (Orthokeratology - tạo hình giác mạc) là phương pháp sử dụng kính áp tròng cứng được thiết kế đặc biệt với mỗi người để định hình tạm thời giác mạc và cải thiện thị lực. Kính Ortho-K thường đeo vào ban đêm để định hình lại bề mặt trước của mắt.
                </div>
                <div className="text-gray-600 pt-2.5 opacity-60 text-justify 2xl:text-lg xl:text-lg lg:text-base text-[14px]">
                  Nhiều nghiên cứu lâm sàng cho thấy kính Ortho K mang lại hiệu quả trong việc giảm tiến triển tật khúc xạ khoảng 50% ở trẻ và thậm chí một số trẻ có kết quả tốt hơn. Ngoài ra, kính Ortho-K có những ưu điểm sau:
                </div>
                <div>
                  <div className="flex md:justify-start justify-center items-center mt-[3%] sm:mt-[5%]" onClick={open}>
                    <div className="p-1.5 bg_button !font-bold cursor-pointer flex items-center gap-2 md:px-6 md:py-3 px-3 py-2 shadow-lg transition-all duration-300 ease-in-out text-[13px] lg:text-[16px] rounded-full my-auto leading-none">
                      <img src={DangKy} alt="Đăng ký" className="md:aspect-1 h-5 w-5" />
                      <span className="flex items-center pt-1">ĐĂNG KÝ TƯ VẤN</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {openModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          ></div>

          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 transform transition-all overflow-hidden
                 duration-300 ease-out scale-100 ${!openModal ? 'animate-[fadeOut_0.3s_ease-in]' : 'animate-[scaleIn_0.3s_ease-out]'}`}>
            <button
              onClick={close}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-red-500 hover:text-white text-gray-500 rounded-full flex items-center justify-center text-2xl transition-all duration-200 z-10"
            >
              ×
            </button>

            <div className="relative z-0 text-left">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Đăng ký tư vấn Ortho-K</h2>
              <p className="text-gray-600 mb-6">
                Vui lòng để lại thông tin, đội ngũ bác sĩ sẽ liên hệ tư vấn trực tiếp cho bạn trong thời gian sớm nhất.
              </p>

              <div className="space-y-4">
                <input type="text" placeholder="Họ và tên" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all" />
                <input type="tel" placeholder="Số điện thoại" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all" />
                <button className="w-full py-4 bg-gradient-to-r from-[#3EED8B] to-[#0A9949] text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity">
                  GỬI YÊU CẦU
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default Section2;