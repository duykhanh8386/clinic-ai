import FiveStar from "../../../assets/Section6/FiveStar.png";
import Right from "../../../assets/Section4/right.svg";
import Left from "../../../assets/Section4/left.svg";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useRef, useState } from "react";
import GridWave from "../../../assets/Section4/GridWave.png";
import { useQuery } from "@tanstack/react-query";
import { listDoctors } from "../../../services/doctor.service";
import { Link } from "react-router-dom";

const PLACEHOLDER_AVATAR = "https://placehold.co/300x380?text=B%C3%A1c+s%C4%A9";

function Section6() {
  const { data } = useQuery({
    queryKey: ["section6-doctors"],
    queryFn: () => listDoctors({ page: 1, limit: 20 }),
  });

  const doctors = data?.data ?? [];

  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <>
      <div className="4k:max-w-[75%] md:max-w-[80%] max-w-[95%] relative mx-auto z-[1]">
        <div className="text-lg lg:text-xl xl:text-[22px] 2xl:text-4xl 4k:text-[40px] font-bold text-center">Đội ngũ bác sĩ của chúng tôi</div>
      </div>

      <div className="w-full relative">
        <div className="absolute z-0 opacity-20"><img src={GridWave} alt="" /></div>
        <div className="4k:max-w-[75%] md:max-w-[80%] max-w-[95%] relative mx-auto z-[1]">
          <div className="relative">
            <div ref={prevRef} className="absolute left-[-2%] top-[40%] z-[2] transition-all hover:scale-110 p-2 cursor-pointer rounded-full bg-white text-[#6FCF97] shadow-lg flex items-center justify-center">
              <img src={Left} alt="left" className="w-7" />
            </div>
            <div ref={nextRef} className="absolute right-[-2%] top-[40%] z-[2] transition-all hover:scale-110 p-2 cursor-pointer rounded-full bg-white text-[#6FCF97] shadow-lg flex items-center justify-center">
              <img src={Right} alt="right" className="w-7" />
            </div>

            <Swiper
              loop={true}
              modules={[Navigation]}
              loopedSlides={7}
              navigation={{
                prevEl: prevRef.current,
                nextEl: nextRef.current,
              }}
              onBeforeInit={(swiper) => {
                swiper.params.navigation.prevEl = prevRef.current;
                swiper.params.navigation.nextEl = nextRef.current;
                swiperRef.current = swiper;
              }}
              watchSlidesProgress={true}
              watchOverflow={true}
              grabCursor={true}
              speed={100}
              effect="slide"
              onSlideChange={(swiper) => { setActiveIndex(swiper.realIndex); }}
              spaceBetween={"2%"}
              centeredSlides={false}
              slidesPerView="auto"
              className="!px-0 !pb-[5%] mt-[3%]"
            >
              {doctors.map((doctor) => (
                <SwiperSlide key={doctor.id} className="flex items-stretch sm:!w-[250px] xl:!w-[295px] 4k:!w-[325px] !w-[200px] h-full shrink-0">
                  <Link
                    to={`/doctors/${doctor.id}`}
                    className="block w-full bg-white border border-[#EBEBEB] shadow-md hover:shadow-2xl transition-all duration-300 ease-in-out rounded-tl-[24%] rounded-tr-[3%] rounded-bl-[3%] rounded-br-[3%]"
                  >
                    <div className="transition-all relative w-full flex justify-center rounded-tl-[24%] rounded-tr-[3%] rounded-bl-[3%] rounded-br-[24%] items-end text-center bg-white">
                      <div className="absolute inset-0 bg_main rounded-tl-[24%] rounded-tr-[3%] rounded-bl-[3%] rounded-br-[24%] opacity-60 z-0"></div>
                      <div className="w-[75%] xl:h-[320px] md:h-[270px] sm:h-[270px] h-[215px] relative z-[1] overflow-hidden">
                        <img
                          src={doctor.avatarUrl || PLACEHOLDER_AVATAR}
                          alt={doctor.fullName}
                          className="w-full h-full object-cover object-top rounded-tl-[10%] rounded-tr-[3%] rounded-bl-[3%] rounded-br-[10%]"
                        />
                      </div>
                    </div>
                    <div className="text-black w-[95%] sm:py-5 py-3 mx-auto text-center">
                      <div className="sm:pt-3 py-1 font-bold xl:text-[20px] lg:text-lg text-[16px] line-clamp-1">{doctor.fullName}</div>
                      <div className="sm:pt-1 text-[#0A9949] xl:text-[17px] lg:text-base text-[14px] line-clamp-1">{doctor.specialty}</div>
                      <div className="py-[2%]">
                        <div className="aspect-auto flex justify-center"><img src={FiveStar} alt="" /></div>
                      </div>
                    </div>
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Custom Pagination: 3 dots only */}
            <div className="flex justify-center gap-2 mt-[0%]">
              {[0, 1, 2].map((i) => {
                const slidesPerView = 3;
                const index = i * slidesPerView;
                const isActive = Math.floor(activeIndex / slidesPerView) === i;
                return (
                  <div
                    key={i}
                    onClick={() => swiperRef.current?.slideToLoop(index)}
                    className={`h-[7px] transition-all cursor-pointer rounded-full duration-300 ease-in-out ${isActive ? "w-[60px] bg_main" : "w-[17px] bg-gray-300"}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Section6;
