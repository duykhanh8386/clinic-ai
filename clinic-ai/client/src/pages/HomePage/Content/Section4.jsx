import { useEffect, useRef } from "react";
import Circle from "../../../assets/Section3/Circle.png";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import Mem1 from "../../../assets/Section4/Mem1.png";
import Mem2 from "../../../assets/Section4/Mem2.png";
import Mem3 from "../../../assets/Section4/Mem3.png";
import Mem4 from "../../../assets/Section4/Mem4.png";
import Mem5 from "../../../assets/Section4/Mem5.png";
import Right from "../../../assets/Section4/right.svg";
import Left from "../../../assets/Section4/left.svg";
import GridWave from "../../../assets/Section4/GridWave.png";
import Union from "../../../assets/Section4/Union.png";
function Section4() {
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const swiperRef = useRef(null);

  useEffect(() => {
    if (
      swiperRef.current &&
      swiperRef.current.params &&
      prevRef.current &&
      nextRef.current
    ) {
      swiperRef.current.params.navigation.prevEl = prevRef.current;
      swiperRef.current.params.navigation.nextEl = nextRef.current;
      swiperRef.current.navigation.destroy(); 
      swiperRef.current.navigation.init();
      swiperRef.current.navigation.update();
    }
  }, []);
  const image=[
    {
      id:1,
      src:Mem1,
      title:"Người bị cận thị",
      para:"Người bị cận thị (dưới 10 độ) không kèm hoặc kèm loạn thị từ 3 độ trở xuống"
    },
     {
      id:2,
      src:Mem2,
      title:"Trẻ em dưới 18 tuổi",
      para:"Trẻ em dưới 18 tuổi chưa đủ độ tuổi để phẫu thuật"
    },
     {
      id:3,
      src:Mem3,
      title:"Chưa có tiền sử phẫu thuật",
      para:"Người chưa có tiền sử phẫu thuật cận thị hoặc các loại phẫu thuật mắt khác"
    },
     {
      id:4,
      src:Mem4,
      title:"Người không có các bệnh lý ",
      para:"Người không có các bệnh lý về bề mặt nhãn cầu"
    },
     {
      id:5,
      src:Mem5,
      title:"Chưa có tiền sử phẫu thuật",
      para:"Người chưa có tiền sử phẫu thuật cận thị hoặc các loại phẫu thuật mắt khác"
    },
     {
      id:6,
      src:Mem1,
      title:"Người bị cận thị",
      para:"Người bị cận thị (dưới 10 độ) không kèm hoặc kèm loạn thị từ 3 độ trở xuống"
    },
     {
      id:7,
      src:Mem2,
      title:"Trẻ em dưới 18 tuổi",
      para:"Trẻ em dưới 18 tuổi chưa đủ độ tuổi để phẫu thuật"
    },
     {
      id:8,
      src:Mem3,
      title:"Chưa có tiền sử phẫu thuật",
      para:"Người chưa có tiền sử phẫu thuật cận thị hoặc các loại phẫu thuật mắt khác"
    },
     {
      id:9,
      src:Mem4,
      title:"Người không có các bệnh lý ",
      para:"Người không có các bệnh lý về bề mặt nhãn cầu"
    },
     {
      id:10,
      src:Mem5,
      title:"Chưa có tiền sử phẫu thuật",
      para:"Người chưa có tiền sử phẫu thuật cận thị hoặc các loại phẫu thuật mắt khác"
    },
  ]
  return(
    <>
      <div className="relative 4k:max-w-[75%] md:max-w-[80%] max-w-[95%] sm:mt-[5%] mt-[2%] mx-auto">
        {/* Decor */}
        <div className=" relative translate-x-2/3">
          <img src={Circle} alt="Circle" className="sm:aspect-[1] w-5 h-5 sm:w-auto sm:h-auto" />
        </div>

        <div className="flex justify-between  sm:flex-nowrap flex-wrap">
          <div className="sm:max-w-[65%] max-w-full">
            <div className="text-lg lg:text-xl xl:text-[22px] 2xl:text-4xl 4k:text-[40px] font-bold">Ai nên sử dụng kính Ortho-K?</div>
            <div className="text-gray-600 pt-2.5 opacity-60  text-justify 2xl:text-lg xl:text-lg lg:text-base text-[14px]">Ortho-K là phương pháp kiểm soát tật khúc xạ tối ưu, an toàn nhất hiện nay dành cho người lớn và trẻ em mà không cần phẫu thuật. Đối tượng có thể sử dụng kính Ortho K bao gồm:</div>
          </div>
          {/* navigate */}
          <div className="flex mx-auto sm:mx-auto gap-4 sm:mt-4 my-3 mt-2  items-center  ">
            <button
              ref={prevRef}
              className="transition-all  hover:scale-110 p-2 cursor-pointer rounded-full bg-white text-[#6FCF97] shadow-lg flex items-center justify-center"
            >
              <img src={Left} alt="left" className="=w-7"/>
            </button>

            <button
              ref={nextRef}
              className="transition-all  hover:scale-110 p-2 cursor-pointer rounded-full bg-white text-[#6FCF97] shadow-lg flex items-center justify-center"
            >
              <img src={Right} alt="right" className="= w-7"/>
            </button>

          </div>
        </div>
      </div>
      
      <div className="w-full relative">
        <div className="absolute z-0 opacity-30"><img src={GridWave} alt="" /></div>
        <div className=" 4k:ml-[12.5%] relative z-[1] md:ml-[10%] ml-[2.5%]">
        
          {/* Content swiper */}
        <div className=" ">
        <Swiper loop={true}
          modules={[Navigation, Pagination]}
          loopedSlides={7}
         
          watchSlidesProgress={true}
          watchOverflow={true}
          grabCursor={true}
          speed={100}
          effect="slide"
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          spaceBetween={'2%'}
         
          centeredSlides={false}
          
          slidesPerView="auto"  
          
          className="!px-0 !pb-0 mt-[3%] "
        >

          {image.map((img) => (
            <SwiperSlide key={img.id} className="flex items-stretch sm:!w-[250px] xl:!w-[295px] 4k:!w-[325px] !w-[200px]  shrink-0">
              <div  
                className={`transition-all  aspect-[1] bg_main relative  w-full   flex flex-col ${img.id%2==0?'mb4:mt-[30%] ':''} 
                  mb4:rounded-tl-[45px] mb4:rounded-tr-2xl mb4:rounded-bl-2xl mb4:rounded-br-[40px]
                   rounded-tl-[25px] rounded-tr-xl rounded-bl-xl rounded-br-[20px] pb-5
                  items-center  text-center bg-white shadow-md hover:shadow-xl border-0`}
              >
                <div className="w-[95%]  ">
                  <img 
                  
                    src={img.src}
                    alt={`Member`}
                    className="w-full mx-auto mt-[2.5%] mb4:rounded-xl rounded-[9px] rounded-tl-[22px] mb4:rounded-tl-[40px] object-cover"
                  />
                  {/* text */}
                  <div className="text-white w-[95%] h-[125px] mx-auto text-left">
                    <div className="sm:pt-3 py-1 flex items-end gap-x-2 xl:text-[20px] lg:text-lg text-[18px] ">{img.title}</div>
                    <div className="sm:pt-2.5 opacity-60  text-justify xl:text-[17px] lg:text-base text-[14px]">{img.para}</div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}

          
        
      
        </Swiper>
   
      </div >
      </div>
      <div className="ml-[5%]">
         <img src={Union} alt="Union" />
      </div>
     
      </div>
    </>
  )
}
export default Section4;
