
import Right from "../../../assets/Section4/right.svg";
import Left from "../../../assets/Section4/left.svg";
import Left1 from "../../../assets/Section7/Left1.png";
import Right1 from "../../../assets/Section7/Right1.png";
import FiveStar from "../../../assets/Section6/FiveStar.png";
import Avt1 from "../../../assets/Section7/Avt1.png";
import Avt2 from "../../../assets/Section7/Avt2.png";
import Avt3 from "../../../assets/Section7/Avt3.png";
import Avt4 from "../../../assets/Section7/Avt4.png";
import Decor from "../../../assets/Section7/Decor.png";
import Bg1 from "../../../assets/Section7/Bg1.png";
import Bg2 from "../../../assets/Section7/Bg2.png";
import Bg3 from "../../../assets/Section7/Bg3.png";
import Bg4 from "../../../assets/Section7/Bg4.png";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { useEffect, useRef, useState } from "react";

function Section7() {
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const swiperRef = useRef(null);
  const [hoverleft, setHoverLeft] = useState(false);
  const [hoverright, setHoverRight] = useState(false);
  useEffect(() => {
    if (
      swiperRef.current &&
      swiperRef.current.params &&
      prevRef.current &&
      nextRef.current
    ) {
      swiperRef.current.params.navigation.prevEl = prevRef.current;
      swiperRef.current.params.navigation.nextEl = nextRef.current;
      swiperRef.current.navigation.init();
      swiperRef.current.navigation.update();

    }
  }, []);
  const data = [
    {
      id: 1,
      bg: Bg1,
      avt: Avt1,
      name: "Nguyễn Minh Anh",
      headline: "Đặt lịch nhanh, được nhắc lịch rõ ràng trước ngày khám.",
      content: "Tôi chọn khám mắt định kỳ và được hướng dẫn đầy đủ từ bước đặt lịch đến nhận kết quả. Không phải chờ lâu, thông tin lịch hẹn hiển thị rất dễ theo dõi.",
    },
    {
      id: 2,
      bg: Bg2,
      avt: Avt2,
      name: "Trần Hoàng Nam",
      headline: "Bác sĩ tư vấn kỹ, giải thích dễ hiểu và đúng trọng tâm.",
      content: "Phần tiền khám giúp tôi ghi trước triệu chứng nên khi gặp bác sĩ trao đổi rất nhanh. Các bước khám được nhân viên hướng dẫn rõ ràng.",
    },
    {
      id: 3,
      bg: Bg3,
      avt: Avt3,
      name: "Lê Thu Hà",
      headline: "Chatbot hỗ trợ tốt các câu hỏi cơ bản trước khi đi khám.",
      content: "Tôi hỏi về chuẩn bị trước khi khám và nhận được hướng dẫn phù hợp. Những thông tin cần kiểm tra thêm đều được nhắc nên liên hệ phòng khám.",
    },
    {
      id: 4,
      bg: Bg4,
      avt: Avt4,
      name: "Phạm Gia Hân",
      headline: "Quy trình khám gọn, lịch hẹn và thông báo rất tiện.",
      content: "Sau khi đặt lịch, tôi nhận được thông báo trạng thái rõ ràng. Khi bác sĩ xác nhận, lịch được cập nhật ngay trên tài khoản.",
    },
    {
      id: 5,
      bg: Bg1,
      avt: Avt1,
      name: "Đỗ Quốc Bảo",
      headline: "Thông tin dịch vụ và chuyên khoa được trình bày dễ chọn.",
      content: "Tôi có thể xem chuyên khoa, dịch vụ liên quan và chọn bác sĩ phù hợp trước khi đặt lịch. Trải nghiệm tổng thể khá mạch lạc.",
    },
    {
      id: 6,
      bg: Bg2,
      avt: Avt2,
      name: "Vũ Thanh Tâm",
      headline: "Nhắc lịch và cập nhật trạng thái giúp tôi chủ động hơn.",
      content: "Khi cần đổi lịch, hệ thống hiển thị thao tác rõ ràng. Tôi không phải gọi nhiều lần để kiểm tra lịch đã được xác nhận hay chưa.",
    },
    {
      id: 7,
      bg: Bg3,
      avt: Avt3,
      name: "Hoàng Minh Quân",
      headline: "Dịch vụ Ortho-K được tư vấn chi tiết trước khi quyết định.",
      content: "Bác sĩ kiểm tra kỹ tình trạng mắt và giải thích từng bước theo dõi sau khi dùng kính. Gia đình tôi thấy yên tâm hơn.",
    },
    {
      id: 8,
      bg: Bg4,
      avt: Avt4,
      name: "Mai Ngọc Linh",
      headline: "Giao diện dễ dùng cho cả người mới đặt lịch lần đầu.",
      content: "Các thông tin quan trọng như giờ khám, bác sĩ, dịch vụ và trạng thái lịch đều nằm ở đúng nơi cần xem. Tôi thao tác trên điện thoại cũng thuận tiện.",
    },
  ];
  return (
    <>
      {/* Background color */}
      <div className="w-full grid grid-cols-2 gap-[2%] sm:mt-[6%] mt-[10%] relative z-0">
        <div className="sm:col-span-1 col-span-2 aspect-[4/3] bg-gradient-to-t from-[var(--main-gradient-from)] to-[var(--main-gradient-to)] 
      sm:rounded-tl-[43.6%] rounded-tl-[23.6%] rounded-tr-[1.25%] sm:rounded-br-[43.6%] rounded-br-[23.6%] rounded-bl-[1.25%]">
        </div>
        <div className="sm:col-span-1 sm:block hidden mt-[5%] self-start ">
          <img src={Decor} alt="" />
        </div>
      </div>
      {/* Title + thanh dieu huong */}
      <div className="relative 4k:max-w-[75%] md:max-w-[80%] max-w-[95%] md:mt-[-30%] sm:mt-[-25%] mt-[-60%] z-[1] mx-auto">
        {/* Decor */}
        <div className="flex justify-between items-center sm:flex-nowrap flex-wrap">
          <div className="sm:max-w-[40%] max-w-full text-white">
            <div className="text-lg lg:text-xl xl:text-[22px] 2xl:text-4xl 4k:text-[38px] font-bold">Cảm nhận của khách hàng sau khi sử dụng dịch vụ</div>
          </div>
          {/* navigate */}
          <div className="flex  gap-4 sm:mt-4 my-3 mt-2  items-center sm:mx-0 mx-auto">
            <button onMouseEnter={() => setHoverLeft(true)}
              onMouseLeave={() => setHoverLeft(false)}
              ref={prevRef}
              className="transition-all  hover:scale-110 p-2 cursor-pointer rounded-full bg-white text-[#6FCF97] shadow-lg flex items-center justify-center"
            >
              <img src={hoverleft ? Left : Left1}
                alt="left" className="=w-7" />
            </button>

            <button onMouseEnter={() => setHoverRight(true)}
              onMouseLeave={() => setHoverRight(false)}
              ref={nextRef}
              className="transition-all  hover:scale-110 p-[7px] cursor-pointer rounded-full bg-white text-[#6FCF97] shadow-lg flex items-center justify-center"
            >
              <img src={hoverright ? Right : Right1} alt="right" className="= w-7" />
            </button>

          </div>
        </div>
      </div>

      {/* Swiper */}
      <div className="4k:max-w-[87%] md:max-w-[90%] sm:max-w-[98%] max-w-[95%] sm:ml-auto sm:mx-0 mx-auto relative">
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
          pagination={{ clickable: true }}
          centeredSlides={false}

          slidesPerView="auto"

          className="!px-0 !pb-[4%] mt-[3%] "
        >

          {data.map((item) => (
            <SwiperSlide key={item.id} className="flex items-stretch   sm:!w-[300px] xl:!w-[355px] 4k:!w-[450px] !w-[220px]  shrink-0">
              <div
                className={`transition-all  bg-white relative  w-full a  flex flex-col 
                  pb-5 rounded-[5%] overflow-hidden
                  items-center  text-center  shadow-md  duration-300 ease-in-out hover:shadow-2xl border-0`}
              >
                <div className="">
                  {/* Background */}
                  <div className="h-[60px]  sm:h-[80px]  lg:h-[90px] flex items-center overflow-hidden">
                    <img

                      src={item.bg}
                      alt={item.name}
                      className="w-full  "
                    />
                  </div>

                  {/* Avata */}
                  <div className="w-full flex justify-center mt-[-10%]">
                    <div className="rounded-full border-2 border-white w-[80px] h-[80px] lg:w-[90px] lg:h-[90px] overflow-hidden">
                      <img

                        src={item.avt}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>


                  {/* text */}
                  <div className=" w-[95%] mx-auto text-center">
                    <div className="sm:pt-3 py-1 text-[#252525] font-bold gap-x-2 xl:text-[20px] lg:text-lg text-[18px] ">{item.name}</div>
                    <div className="aspect-auto flex justify-center"><img src={FiveStar} alt="5 sao " /></div>
                    <div className="sm:pt-2.5 line-clamp-3 text-[#252525] font-semibold sm:text-[16px] text-sm">{item.headline}</div>
                    <div className="sm:pt-2.5 line-clamp-4 text-[#454545]  text-center sm:text-[14px] text-xs">{item.content}</div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}




        </Swiper>
      </div>

    </>
  )
}
export default Section7;
