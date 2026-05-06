
import Logo1 from "../../../assets/Footer/Logo1.png";
import Facebook from "../../../assets/Footer/Facebook.png";
import Youtube from "../../../assets/Footer/Youtube.png";
import Tiktok from "../../../assets/Footer/Tiktok.png";
import BoCongThuong from "../../../assets/Footer/BoCongThuong.png"
import { useState } from "react";
function Footer(){
  //open modal
    const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const handleShowMenu =()=>{
    if(isOpen){
      closeMenu();
    }else{
      openMenu();
    }
  }
  const openMenu = () => {
    if (window.innerWidth < 1010){
      setIsOpen(true);
    setTimeout(() => setIsAnimating(true), 10);
    }
    
  };

  const closeMenu = () => {
    if (window.innerWidth < 1010){
      setIsAnimating(false);
      setTimeout(() => setIsOpen(false), 300); // duration khớp transition
    }
    
  };
  //open modal1
    const [isOpen1, setIsOpen1] = useState(false);
  const [isAnimating1, setIsAnimating1] = useState(false);
  const handleShowMenu1 =()=>{
    if(isOpen1){
      closeMenu1();
    }else{
      openMenu1();
    }
  }
  const openMenu1 = () => {
    if (window.innerWidth < 1010){
      setIsOpen1(true);
    setTimeout(() => setIsAnimating1(true), 10);
    }
    
  };

  const closeMenu1 = () => {
    if (window.innerWidth < 1010){
      setIsAnimating1(false);
      setTimeout(() => setIsOpen1(false), 300); // duration khớp transition
    }
    
  };
  //open modal1
    const [isOpen2, setIsOpen2] = useState(false);
  const [isAnimating2, setIsAnimating2] = useState(false);
  const handleShowMenu2 =()=>{
    if(isOpen2){
      closeMenu2();
    }else{
      openMenu2();
    }
  }
  const openMenu2 = () => {
    if (window.innerWidth < 1010){
      setIsOpen2(true);
    setTimeout(() => setIsAnimating2(true), 10);
    }
    
  };

  const closeMenu2 = () => {
    if (window.innerWidth < 1010){
      setIsAnimating2(false);
      setTimeout(() => setIsOpen2(false), 300); // duration khớp transition
    }
    
  };
    //open modal1
    const [isOpen3, setIsOpen3] = useState(false);
  const [isAnimating3, setIsAnimating3] = useState(false);
  const handleShowMenu3 =()=>{
    if(isOpen3){
      closeMenu3();
    }else{
      openMenu3();
    }
  }
  const openMenu3 = () => {
    if (window.innerWidth < 1010){
      setIsOpen3(true);
    setTimeout(() => setIsAnimating3(true), 10);
    }
    
  };

  const closeMenu3 = () => {
    if (window.innerWidth < 1010){
      setIsAnimating3(false);
      setTimeout(() => setIsOpen3(false), 300); // duration khớp transition
    }
    
  };
  return(
    <>
  
    <footer className="relative bg-gradient-to-r w-full  from-[#1CAB55] to-[#04A4EC] text-white  ">
  {/* Vùng vector bo cong phía trên */}
  



  {/* Nội dung chính */}
  <div className="relative z-[1] 4k:max-w-[75%] sm:max-w-[80%] max-w-[95%] mx-auto grid lg:grid-cols-13 grid-cols-5 lg:pb-[20px] sm:pb-[5%] pb-[10px] pt-[5%] gap-[5%] xl:gap-[5%]">
    <div className="col-span-2 lg:block hidden">
        <img src={Logo1} alt="Logo" className="w-full " />
    </div>
    <div className="col-start-4 col-end-8 lg:block hidden">
         <h3  className="font-medium mt-0.5 text-[14px]  text-white xl:text-xl 4k:text-xl ">Thông tin liên hệ</h3>
    </div>
    <div className="col-span-3 lg:block hidden">
         <h3 className="font-medium mt-0.5 text-[14px]  text-white xl:text-xl 4k:text-xl ">Giờ làm việc</h3>
    </div>
    <div className="col-span-3 lg:block hidden">
        <h3 className="font-medium mt-0.5 text-[14px]  text-white xl:text-xl 4k:text-xl ">Theo dõi chúng tôi</h3>
    </div>
    {/* Cột 1: logo + mô tả */}
    <div className="lg:col-span-3 col-span-4 grid grid-cols-4">
      <div onClick={handleShowMenu1} className="col-span-2"><img src={Logo1} alt="Logo" className="w-full mb-3  block lg:hidden" /></div>
      <div className="col-span-4 sm:block hidden">
        <h3 className="font-medium mt-0.5 text-[14px]  text-white xl:text-xl 4k:text-xl mb-2">Bệnh viện đa khoa phương đông</h3>
        <p className="mt-0.5 text-[14px] lg:text-[12px] text-justify text-white xl:text-[16px] opacity-80">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Urna sit morbi nisl contale consectetur
          pellentesque ullamcorper con viverra id cursus hendreritenim ultricies
        </p>
      </div>
      {
        isOpen1&&(<div className="col-span-4 block sm:hidden">
          <div className={` ${isAnimating1 ? 'translate-y-0 opacity-100' : 'translate-y-[-30px] opacity-0'} transition-all duration-300 ease-in-out transform`}>
        <h3 className="font-medium mt-0.5 text-[14px]  text-white xl:text-xl 4k:text-xl mb-2">Bệnh viện đa khoa phương đông</h3>
        <p className="mt-0.5 text-[14px] lg:text-[12px] text-justify text-white xl:text-sm 4k:text-xl opacity-80">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Urna sit morbi nisl contale consectetur
          pellentesque ullamcorper con viverra id cursus hendreritenim ultricies
        </p>
        </div>
      </div>)
      }
    </div>

    {/* Cột 2: thông tin liên hệ */}
    <div className="col-span-4 mr-[-5%]">
      <h3 onClick={handleShowMenu} className="cursor-pointer font-medium mt-0.5 text-[14px] block lg:hidden text-white xl:text-xl 4k:text-xl mb-2">Thông tin liên hệ</h3>
      <div className="sm:block hidden mt-0.5 text-[14px] lg:text-[12px] text-justify text-white xl:text-[16px] ">
        <p className="opacity-80">Địa chỉ: Số 9, Phố Viên, Cổ Nhuế 2, Bắc Từ Liêm, Hà Nội</p>
        <span className="opacity-80">Email: </span><span className="font-medium ">bvphuongdong@phuongdonghospital.vn</span>
        <p className="font-medium ">info.benhvienphuongdong@gmail.com</p>
        <span className="opacity-80">Tổng đài tư vấn: </span><span className="font-medium">19001806</span>
      </div>
      {
        isOpen &&(

          <div className="block sm:hidden mt-0.5 text-[14px] lg:text-[12px] text-justify text-white xl:text-sm 4k:text-xl ">
            <div className={` ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-[-30px] opacity-0'} transition-all duration-300 ease-in-out transform`}>
        <p className="opacity-80">Địa chỉ: Số 9, Phố Viên, Cổ Nhuế 2, Bắc Từ Liêm, Hà Nội</p>
        <span className="opacity-80">Email: </span><span className="font-medium ">bvphuongdong@phuongdonghospital.vn</span>
        <p className="font-medium ">info.benhvienphuongdong@gmail.com</p>
        <span className="opacity-80">Tổng đài tư vấn: </span><span className="font-medium">19001806</span></div>
      </div>
        )
      }
    </div>

    {/* Cột 3: giờ làm việc */}
    <div className="col-span-3">
      <h3 onClick={handleShowMenu2} className="font-medium mt-0.5 text-[14px] block lg:hidden text-white xl:text-xl 4k:text-xl mb-2">Giờ làm việc</h3>
      <div className="mt-0.5 sm:block hidden text-[14px] lg:text-[12px] text-justify text-white xl:text-[16px] opacity-80">
        <p>Từ 7:00 - 19:00 từ Thứ 2 đến CN</p>
        <p>Cấp cứu 24/7: 0833 015 115</p>
        <p>Hotline Tiêm chủng: 0911 615 115</p>
        <p>Hotline Hỗ trợ khách hàng: 1900 1806</p>
      </div>
      {isOpen2&&(
        <div className="mt-0.5 block sm:hidden text-[14px] lg:text-[12px] text-justify text-white xl:text-sm 4k:text-xl opacity-80">
          <div className={` ${isAnimating2 ? 'translate-y-0 opacity-100' : 'translate-y-[-30px] opacity-0'} transition-all duration-300 ease-in-out transform`}>
        <p>Từ 7:00 - 19:00 từ Thứ 2 đến CN</p>
        <p>Cấp cứu 24/7: 0833 015 115</p>
        <p>Hotline Tiêm chủng: 0911 615 115</p>
        <p>Hotline Hỗ trợ khách hàng: 1900 1806</p>
        </div>
        </div>
      )}
    </div>

    {/* Cột 4: theo dõi */}
    <div className="lg:col-span-3 col-span-5 grid grid-cols-5 lg:gap-y-3">
      <h3 onClick={handleShowMenu3} className="font-medium col-span-3 mt-0.5 text-[14px] block lg:hidden text-white xl:text-xl 4k:text-xl mb-2">Theo dõi chúng tôi</h3>
      <div className="sm:grid sm:grid-cols-5 sm:gap-4 sm:col-span-5 hidden sm:items-center">
        <div className="col-span-3 sm:col-span-4 lg:col-span-5 flex gap-4">
        <a href="#" className="w-10 h-10 border bg-white rounded-full flex items-center justify-center">
          <img src={Facebook} alt="Facebook" />
        </a>
        <a href="#" className="w-10 h-10 border bg-white rounded-full flex items-center justify-center">
          <img src={Youtube} alt="Youtube" />
        </a>
        <a href="#" className="w-10 h-10 border bg-white rounded-full flex items-center justify-center">
          <img src={Tiktok} alt="Tiktok" />
        </a></div>
        <span className="sm:col-start-5 col-span-2 lg:col-start-1 lg:col-span-4"><img src={BoCongThuong}
           alt="Bộ công thương" className="w-full  h-auto" /></span>
      </div>
      {
        isOpen3&&(
          <div className={`grid grid-cols-5 gap-4 sm:hidden col-span-5 items-center  transition-all duration-300 ease-in-out transform ${isAnimating3 ? 'translate-y-0 opacity-100' : 'translate-y-[-30px] opacity-0'}`}>
        <div className="col-span-3 sm:col-span-4 lg:col-span-5 flex gap-4">
        <a href="#" className="w-10 h-10 border bg-white rounded-full flex items-center justify-center">
          <img src={Facebook} alt="Facebook" />
        </a>
        <a href="#" className="w-10 h-10 border bg-white rounded-full flex items-center justify-center">
          <img src={Youtube} alt="Youtube" />
        </a>
        <a href="#" className="w-10 h-10 border bg-white rounded-full flex items-center justify-center">
          <img src={Tiktok} alt="Tiktok" />
        </a></div>
        <span className="sm:col-start-5 col-span-2 lg:col-start-1 lg:col-span-4"><img src={BoCongThuong}
           alt="Bộ công thương" className="w-full  h-auto" /></span>
      </div>
        )
      }
      
    </div>
  </div>

  {/* Footer dưới */}
  <div className="border-t border-white/20 mt-[10%] mb4:mt-[5%] md:mt-[5%] py-5 flex items-center justify-center lg:mt-0 text-center text-sm z-1 relative">
    © Copyright 2022 Bệnh Viện Đa khoa Phương Đông. All rights reserved
  </div>
</footer>

    </>
  )
}
export default Footer;