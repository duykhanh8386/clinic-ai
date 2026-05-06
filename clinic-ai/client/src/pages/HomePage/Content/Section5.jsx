import Doctor from "../../../assets/Section5/Doctor.png";
import LogoBg from "../../../assets/Section5/LogoBg.png";
import DangKy from "../../../assets/Section2/DangKy.png";
import KeNgang from "../../../assets/Section5/KeNgang.png";
import HienVi from "../../../assets/Section5/HienVi.png";
import Ly from "../../../assets/Section5/Ly.png";
import Note from "../../../assets/Section5/Note.png";
import Health from "../../../assets/Section5/Health.png";
import BackgroundImg from "../../../assets/Section2/BackgroundImg.png";
import Circle from "../../../assets/Section3/Circle.png";
import { useState } from "react";
import { createPortal } from "react-dom";

function Section5() {
  const [showModal, setShowModal] = useState(false);

  const open = () => {
    setShowModal(true);
    document.body.style.overflow = 'hidden';
  }
  const close = () => {
    setShowModal(false);
    document.body.style.overflow = 'unset';
  }
  return (
    <>
      <div className="4k:max-w-[87%] md:max-w-[90%] sm:max-w-[98%] max-w-[95%] sm:ml-auto sm:mx-0 mx-auto md:mt-[5%] relative">
        <div className="grid grid-cols-7 sm:gap-[5%] gap-[1%] relative z-[1]">
          {/* Text left */}
          <div className="sm:col-span-3 col-span-7 grid grid-cols-2 xl:self-end self-center text-left">
            <div className="col-span-2 ">
              <div className="text-lg lg:text-xl xl:text-[22px] 2xl:text-4xl 4k:text-[40px] font-bold">Tại sao nên chọn gói Ortho-K tại Bệnh viện Đa khoa Phương Đông?</div>
              <div className="text-gray-600 pt-2.5 opacity-60  text-justify 2xl:text-lg xl:text-lg lg:text-base text-[14px]">Hiện nay, tại Bệnh viện Đa khoa Phương Đông đáp ứng đầy đủ từ đội ngũ bác sĩ có trình độ chuyên môn cao, cơ sở vật chất, trang thiết bị kỹ thuật hiện đại giúp quá trình thăm khám và điều trị các bệnh về tật khúc xạ an toàn, chính xác. Khi đăng ký sử dụng gói kính Ortho - K tại bệnh viện Phương Đông, khách hàng được trải nghiệm dịch vụ y tế chất lượng cao cùng với các ưu điểm vượt trội sau</div>
            </div>
            <div className="col-span-2 hidden xl:grid grid-cols-2 gap-[3%] mt-[3%]">
              {/* Cot 1 */}
              <div className="col-span-1 flex-col flex gap-[8%]">
                <div className=" hover:bg-white hover:shadow-2xl px-7 py-7 border-[#EBEBEB] border-2 hover:border-white rounded-2xl bg-[#FBFBFB] place-items-center transition-all duration-300 ease-in-out">
                  <img src={Health} alt="Health" className="w-[3.09vw]"/>
                  <div className="text-[1rem] pt-2.5 text-center font-bold">Đội ngũ bác sĩ giàu kinh nghiệm</div>
                  <div className="text-[1rem] pt-2.5 text-center text-gray-600">Hiện nay, tại Bệnh viện Đa khoa Phương Đông đáp ứng đầy đủ từ đội ngũ bác sĩ.</div>
                </div>
                <div className=" hover:bg-white hover:shadow-2xl px-7 py-7 border-[#EBEBEB] border-2 hover:border-white rounded-2xl bg-[#FBFBFB] place-items-center transition-all duration-300 ease-in-out">
                  <img src={HienVi} alt="Health" className="w-[3.09vw]"/>
                  <div className="text-[1rem] pt-2.5 text-center font-bold">Trang thiết bị hiện đại</div>
                  <div className="text-[1rem] pt-2.5 text-center text-gray-600">Hiện nay, tại Bệnh viện Đa khoa Phương Đông đáp ứng đầy đủ từ đội ngũ bác sĩ.</div>
                </div>
              </div>
              {/* Cot 2 */}
              <div className="col-span-1 mt-[10%] flex-col flex gap-y-[5%]">
                <div className=" hover:bg-white hover:shadow-2xl px-7 py-7 border-[#EBEBEB] border-2 hover:border-white rounded-2xl bg-[#FBFBFB] place-items-center transition-all duration-300 ease-in-out">
                  <img src={Note} alt="Health" className="w-[3.09vw]"/>
                  <div className="text-[1rem] pt-2.5 text-center font-bold">Đảm bảo chất lượng an toàn tuyệt đối</div>
                  <div className="text-[1rem] pt-2.5 text-center text-gray-600">Hiện nay, tại Bệnh viện Đa khoa Phương Đông đáp ứng đầy đủ từ đội ngũ bác sĩ.</div>
                </div>
                <div className=" hover:bg-white  hover:shadow-2xl mt-[10%] px-7 py-7 border-[#EBEBEB] border-2 hover:border-white rounded-2xl bg-[#FBFBFB] place-items-center transition-all duration-300 ease-in-out">
                  <img src={Ly} alt="Health" className="w-[3.09vw]"/>
                  <div className="text-[1rem] pt-2.5 text-center font-bold">Dịch vụ chuyên nghiệp</div>
                  <div className="text-[1rem] pt-2.5 text-center text-gray-600">Hiện nay, tại Bệnh viện Đa khoa Phương Đông đáp ứng đầy đủ từ đội ngũ bác sĩ.</div>
                </div>
              </div>

            </div>

          </div>
          
          {/* End text */}
          <div className=" sm:col-span-4 col-span-7 bg_main justify-center aspect-[1] flex items-end  rounded-tl-[45%] relative z-1 overflow-hidden rounded-br-[45%]">
            <img src={LogoBg} alt="Logo" className="absolute w-[80%] m-auto inset-0 z-1" />
            <div className="justify-center aspect-[1] h-full flex ">
              <img src={Doctor} alt="Banner" className="absolute z-1 w-full h-full bottom-0 object-cover items-end" />
              {/* Button */}
              <div className="absolute z-[1]  top-[43%] lg:left-[16.5%] md:left-[16%] sm:left-[14%] mb5:left-[16%] mb2:left-[14%] mb3:left-[15%] left-[15%]">
                <div className="flex justify-center  items-center mt-[3%] sm:mt-[5%]" onClick={open}>
                  <div className="p-1.5 bg_button !font-bold cursor-pointer  items-center gap-[0.5em]
                  sm:text-[0.9vw] text-[12px] mb5:flex hidden mb5:py-[0.6vw] py-[0.8vw] mb5:px-[1.5vw] shadow-lg transition-all duration-300 ease-in-out rounded-full my-auto leading-none">
                    <img src={DangKy} alt="Đăng ký" className="sm:w-[1.2vw] w-[4vw] aspect-square" />
                    <span className="pt-[0.1vw]  font-bold leading-none">ĐĂNG KÝ TƯ VẤN</span>
                    
                  </div>
                </div>
                <div className=" w-[50%] mt-[15%] ml-[5%] mb5:block hidden">
                  <div className="mt-0.5 sm:mt-1"><img src={KeNgang} alt="KeNgang" /></div>
                  <div className="mt-0.5 sm:mt-1"><img src={KeNgang} alt="KeNgang" /></div>
                  <div className="mt-0.5 sm:mt-1"><img src={KeNgang} alt="KeNgang" /></div>
                  <div className="mt-0.5 sm:mt-1"><img src={KeNgang} alt="KeNgang" /></div>
                </div>
              </div>
              {/* end button */}

            </div>
          </div>
          {/* Card moblie */}
          <div className="col-span-7 xl:hidden mt-[5%] sm:mt-[3%] grid grid-cols-2 mb4:gap-[3%] ">
              {/* Cot 1 */}
              <div className="col-span-2 mb4:col-span-1 flex-col flex gap-[8%]">
                <div className=" hover:bg-white hover:shadow-2xl px-7 py-7 border-[#EBEBEB] border-2 hover:border-white rounded-2xl bg-[#FBFBFB] place-items-center transition-all duration-300 ease-in-out">
                  <img src={Health} alt="Health" className="aspect-[1]"/>
                  <div className="text-[1rem] pt-2.5 text-center font-bold">Đội ngũ bác sĩ giàu kinh nghiệm</div>
                  <div className="text-[1rem] pt-2.5 text-center text-gray-600">Hiện nay, tại Bệnh viện Đa khoa Phương Đông đáp ứng đầy đủ từ đội ngũ bác sĩ.</div>
                </div>
                <div className=" hover:bg-white mt-[2%] mb4:mt-0 hover:shadow-2xl px-7 py-7 border-[#EBEBEB] border-2 hover:border-white rounded-2xl bg-[#FBFBFB] place-items-center transition-all duration-300 ease-in-out">
                  <img src={Health} alt="Health" className="aspect-[1]"/>
                  <div className="text-[1rem] pt-2.5 text-center font-bold">Đội ngũ bác sĩ giàu kinh nghiệm</div>
                  <div className="text-[1rem] pt-2.5 text-center text-gray-600">Hiện nay, tại Bệnh viện Đa khoa Phương Đông đáp ứng đầy đủ từ đội ngũ bác sĩ.</div>
                </div>
              </div>
              {/* Cot 2 */}
              <div className="col-span-2 mb4:col-span-1 mb4:mt-[10%] mt-[2%] flex-col flex gap-y-[5%]">
                <div className=" hover:bg-white hover:shadow-2xl px-7 py-7 border-[#EBEBEB] border-2 hover:border-white rounded-2xl bg-[#FBFBFB] place-items-center transition-all duration-300 ease-in-out">
                  <img src={Health} alt="Health" className="aspect-[1]"/>
                  <div className="text-[1rem] pt-2.5 text-center font-bold">Đội ngũ bác sĩ giàu kinh nghiệm</div>
                  <div className="text-[1rem] pt-2.5 text-center text-gray-600">Hiện nay, tại Bệnh viện Đa khoa Phương Đông đáp ứng đầy đủ từ đội ngũ bác sĩ.</div>
                </div>
                <div className=" hover:bg-white  hover:shadow-2xl mb4:mt-[10%] mt-[2%] px-7 py-7 border-[#EBEBEB] border-2 hover:border-white rounded-2xl bg-[#FBFBFB] place-items-center transition-all duration-300 ease-in-out">
                  <img src={Health} alt="Health" className="aspect-[1]"/>
                  <div className="text-[1rem] pt-2.5 text-center font-bold">Đội ngũ bác sĩ giàu kinh nghiệm</div>
                  <div className="text-[1rem] pt-2.5 text-center text-gray-600">Hiện nay, tại Bệnh viện Đa khoa Phương Đông đáp ứng đầy đủ từ đội ngũ bác sĩ.</div>
                </div>
              </div>

            </div>
        </div>
{/* background */}
        <img src={BackgroundImg} alt="BackgroundImg" className="absolute top-[35%] w-[70%] h-[145%]  right-0 z-0" />
      </div>
      
      {/* Show Modal with Portal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          ></div>

          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 transform transition-all overflow-hidden
                 duration-300 ease-out scale-100 ${!showModal ? 'animate-[fadeOut_0.3s_ease-in]' : 'animate-[scaleIn_0.3s_ease-out]'}`}>
            <button
              onClick={close}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-red-500 hover:text-white text-gray-500 rounded-full flex items-center justify-center text-2xl transition-all duration-200 z-10"
            >
              ×
            </button>

            <div className="relative z-0 text-left">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Đăng ký tư vấn Phương Đông</h2>
              <p className="text-gray-600 mb-6">
                Nhận tư vấn chuyên sâu về gói Ortho-K và các ưu đãi hiện có tại Bệnh viện Phương Đông.
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

      <div className="aspect-auto ml-[5%]"><img src={Circle} alt="Circle" /></div>
    </>
  )
}
export default Section5;