import Decor1 from "../../../assets/Section1/Decor1.png";
import Decor2 from "../../../assets/Section1/Decor2.png";
import { toast } from "../../../utils/toast";
import Banner from "../../../assets/Section1/Banner.png";
import LogoBg from "../../../assets/Section1/LogoBg.png";
import BackgroundImg from "../../../assets/Section2/BackgroundImg.png";
import MayBay from "../../../assets/Section1/MayBay.png";
import { useRef, useState } from "react";
function Section1() {
  const [phone, setPhone] = useState("");
  const inputRef = useRef(null);
const [error, setError] = useState(false);
const handleChange = (e) => {
  const value = e.target.value;
  setPhone(value);

  // Nếu không phải số hoặc dài hơn 10 ký tự
  if (!/^\d*$/.test(value) || value.length > 10) {
    setError(true);
  } else {
    setError(false);
  }
};
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      toast.error("Số điện thoại không hợp lệ.");
      return;
    }
   
    toast.success("Đăng ký tư vấn thành công! Chúng tôi sẽ liên hệ lại sớm.");
    setPhone("")
  };
  const handleClick = () => {
    inputRef.current.focus();
  }
  return (
    <div className="overflow-x-clip relative">
      <div className="absolute left-3 top-[10%] z-0">
        <img src={Decor1} alt="Decor1" />
      </div>
      <div className="4k:max-w-[87%] md:max-w-[90%] sm:max-w-[98%] max-w-[95%] ml-auto relative">


        {/* Grid */}
        <div className="grid md:grid-cols-2 grid-cols-1 gap-3 self-stretch">
          {/* banner */}
          <div className="md:hidden col-span-1 relative">
          <div className=" md:hidden col-span-1  bg_main justify-center aspect-[1/1] flex items-end  rounded-tl-[45%] relative z-1 overflow-hidden rounded-br-[45%]">
            <img src={LogoBg} alt="Logo" className="absolute inset-0 z-1" />
            <div className="justify-center h-full flex ">
              <img src={Banner} alt="Banner" className="absolute z-1 h-[90%]  w-auto bottom-0 m-auto items-end" />
            </div>
            
          </div>
          {/* decor 2 */}
             <div className="absolute left-[0%] block md:hidden bottom-[-5%] z-0">
              <img src={Decor2} alt="Decor2" />
            </div>
          </div>
          <div className="col-span-1 self-center relative z-2 sm:ml-0 ml-[-3%]">
            <div className="font-lato font-bold text-2xl sm:text-3xl lg:text-4xl 2xl:text-6xl lg:mb-[3%] lg:mt-0 md:mt-[17%] mt-[6%]">Hãy để đôi mắt là cửa sổ của tâm hồn</div>
            <div className="2xl:text-lg text-gray-600 xl:text-lg lg:text-base lg:mb-[10%] mb-[2%] text-[14px]">Ortho-K (Orthokeratology - tạo hình giác mạc) là phương pháp sử dụng kính áp tròng cứng được thiết kế đặc biệt với mỗi người để định hình tạm thời giác mạc và cải thiện thị lực. Kính Ortho-K thường đeo vào ban đêm để định hình lại bề mặt trước của mắt.</div>
            <div className="text-black 2xl:text-lg  xl:text-lg lg:text-base text-[14px]  lg:mb-[3%] font-bold">Siêu khuyến mãi
              <span className="bg-gradient-to-r from-[#48C498] to-[#41C2B1] bg-clip-text text-transparent 2xl:text-3xl  xl:text-2xl lg:text-xl text-[18px]"> tháng 8</span>, giảm ngay
              <span className="bg-gradient-to-r from-[#3BC1C8] to-[#37BED5] bg-clip-text text-transparent 2xl:text-3xl  xl:text-2xl lg:text-xl text-[18px]"> 30% </span> khi đăng ký tại đây!
            </div>
            {/* input */}
            <div className="bg_main p-[1px] mt-2 rounded-full inline-flex w-full max-w-[90%]">

              <div id="focus-input" className="flex w-full items-center justify-between bg-white rounded-full lg:px-3 px-1.5 lg:py-2 py-1">
                <form onSubmit={handleSubmit} onClick={handleClick} className="flex justify-between w-full"><input
                  id="input"
                  type="number"
                  value={phone}
                  ref={inputRef}
                  onChange={handleChange}
                  placeholder="Nhập số điện thoại..."
                  className={`outline-none 2xl:text-lg xl:text-lg lg:text-base text-sm placeholder-gray-400 bg-transparent 
                   ${error ? 'text-red-500 placeholder-red-400' : 'text-gray-700'}`}
                />
                  <button type="submit" className=" px-3 lg:py-2 py-1 4k:py-4  text-white  font-bold rounded-full bg-gradient-to-r from-[#3EED8B] to-[#0A9949]
                2xl:text-lg  xl:text-lg lg:text-base text-sm  cursor-pointer shadow-md hover:opacity-90 transition ">
                    <div className="lg:flex justify-around gap-2 items-center hidden"><img src={MayBay} alt="MayBay" className="h-5"/> GỬI THÔNG TIN</div>
                    <div className="flex justify-around gap-2 items-center lg:hidden"><img src={MayBay} alt="MayBay" className="h-5 "/> GỬI</div>
                  </button></form>
              </div>

            </div>


          </div>
          {/* Anh banner phai */}
          <div className="col-span-1 aspect-1 relative">
            <div className="col-span-1 bg_main justify-center aspect-[1] hidden md:flex items-end rounded-tl-[45%] relative z-2 overflow-hidden rounded-br-[45%]">
              <img src={LogoBg} alt="Logo" className="absolute inset-0 z-0" />
              <div className="justify-center h-full flex ">
                <img src={Banner} alt="Banner" className="absolute z-1 h-[90%]  w-auto bottom-0 m-auto items-end" /></div>

            </div>
            <div className="absolute left-[-20%] md:block hidden bottom-[-10%] z-1">
              <img src={Decor2} alt="Decor2" />
            </div>
           
          </div>
        </div><img src={BackgroundImg} alt="BackgroundImg" className="absolute top-[90%]  w-[87%] left-[-6%] z-0" />
      </div>
    </div>
  )
}
export default Section1;