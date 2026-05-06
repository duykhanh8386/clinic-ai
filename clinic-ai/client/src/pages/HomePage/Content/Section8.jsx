import { useRef, useState } from "react";
import Circle from "../../../assets/Section3/Circle.png";
import Tru from "../../../assets/Section8/Tru.png";
import Cong from "../../../assets/Section8/Cong.png";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";

const faqItems = [
  {
    id: 1,
    title: "Khi nào tôi nên đi khám mắt?",
    content:
      "Bạn nên đi khám khi có đau mắt, đỏ mắt, nhìn mờ, chảy nước mắt nhiều, cộm xốn kéo dài, nhạy cảm ánh sáng hoặc đau đầu liên quan đến thị lực. Nếu đau dữ dội hoặc giảm thị lực đột ngột, cần đi khám càng sớm càng tốt.",
  },
  {
    id: 2,
    title: "Khám mắt định kỳ bao lâu một lần?",
    content:
      "Người trưởng thành nên kiểm tra mắt định kỳ 6-12 tháng/lần. Trẻ em, người cận thị, người dùng kính Ortho-K hoặc có bệnh nền như đái tháo đường nên theo lịch hẹn riêng của bác sĩ.",
  },
  {
    id: 3,
    title: "Ortho-K là gì?",
    content:
      "Ortho-K là kính áp tròng cứng đeo ban đêm để định hình giác mạc tạm thời, giúp nhìn rõ hơn vào ban ngày mà không cần kính gọng. Việc sử dụng cần được khám, đo và theo dõi bởi bác sĩ chuyên khoa mắt.",
  },
  {
    id: 4,
    title: "Ai phù hợp với kính Ortho-K?",
    content:
      "Ortho-K thường phù hợp với người cận thị còn trong ngưỡng chỉ định, giác mạc đủ điều kiện và có khả năng tuân thủ vệ sinh kính. Bác sĩ sẽ đánh giá qua khám khúc xạ, bản đồ giác mạc và tình trạng bề mặt mắt.",
  },
  {
    id: 5,
    title: "Tôi cần chuẩn bị gì trước khi đi khám?",
    content:
      "Bạn nên mang theo giấy tờ tùy thân, đơn thuốc hoặc kết quả khám cũ nếu có, kính đang dùng và ghi lại triệu chứng chính. Nếu khám mắt, hạn chế tự dùng thuốc nhỏ mắt không rõ loại trước khi được tư vấn.",
  },
  {
    id: 6,
    title: "Có thể đổi hoặc hủy lịch khám không?",
    content:
      "Bạn có thể đổi hoặc hủy lịch theo quy định thời gian của phòng khám. Với lịch đã sát giờ khám, hệ thống có thể hạn chế thao tác để tránh ảnh hưởng lịch làm việc của bác sĩ.",
  },
  {
    id: 7,
    title: "Chatbot trả lời dựa trên nguồn nào?",
    content:
      "Chatbot ưu tiên trả lời dựa trên Knowledge Base nội bộ đã được admin xử lý thành chunks. Các câu trả lời chỉ mang tính tham khảo và không thay thế kết luận của bác sĩ.",
  },
  {
    id: 8,
    title: "Sau khi bác sĩ xác nhận lịch, tôi cần làm gì?",
    content:
      "Bạn nên kiểm tra lại thời gian khám, đến đúng giờ và chuẩn bị thông tin tiền khám nếu hệ thống yêu cầu. Nếu có thay đổi triệu chứng trước buổi khám, hãy cập nhật để bác sĩ nắm được.",
  },
];

const orthoPackages = [
  {
    id: 1,
    title: "ORTHO K - 01",
    subtitle: "2 mắt dưới 5 diop",
    price: "Liên hệ phòng khám",
    items: [
      ["Khám và tư vấn chuyên khoa mắt", "Đánh giá chỉ định Ortho-K"],
      ["Thử kính và đo khúc xạ", "Xác định độ cận, loạn và tình trạng thị lực"],
      ["Chụp bản đồ giác mạc", "Kiểm tra hình dạng giác mạc trước khi đặt kính"],
      ["Hướng dẫn sử dụng kính", "Tập đeo, tháo, vệ sinh và bảo quản kính"],
    ],
  },
  {
    id: 2,
    title: "ORTHO K - 02",
    subtitle: "2 mắt từ 5 đến dưới 7 diop",
    price: "Liên hệ phòng khám",
    items: [
      ["Khám chuyên sâu khúc xạ", "Đánh giá mức độ cận và nguy cơ tiến triển"],
      ["Thiết kế kính cá nhân hóa", "Tối ưu thông số theo giác mạc từng mắt"],
      ["Theo dõi thích nghi ban đầu", "Kiểm tra thị lực sau các đêm đầu sử dụng"],
      ["Tái khám theo lịch", "Điều chỉnh hướng dẫn khi cần thiết"],
    ],
  },
  {
    id: 3,
    title: "ORTHO K - 03",
    subtitle: "Cận kèm loạn thị",
    price: "Liên hệ phòng khám",
    items: [
      ["Khám khúc xạ và loạn thị", "Đo chính xác trục và mức độ loạn"],
      ["Chụp bản đồ giác mạc", "Đánh giá độ đều bề mặt giác mạc"],
      ["Tư vấn phác đồ theo dõi", "Theo dõi đáp ứng của từng mắt"],
      ["Hướng dẫn chăm sóc kính", "Giảm nguy cơ kích ứng và nhiễm khuẩn"],
    ],
  },
  {
    id: 4,
    title: "ORTHO K - 04",
    subtitle: "Trẻ em cần kiểm soát tiến triển cận thị",
    price: "Liên hệ phòng khám",
    items: [
      ["Đánh giá thị lực trẻ em", "Kiểm tra độ cận và thói quen nhìn gần"],
      ["Tư vấn phụ huynh", "Hướng dẫn theo dõi, vệ sinh và nhắc lịch tái khám"],
      ["Thiết kế kính theo mắt trẻ", "Chọn thông số phù hợp khả năng thích nghi"],
      ["Theo dõi định kỳ", "Đánh giá hiệu quả kiểm soát cận thị"],
    ],
  },
  {
    id: 5,
    title: "ORTHO K - 05",
    subtitle: "Gói theo dõi và tái khám định kỳ",
    price: "Liên hệ phòng khám",
    items: [
      ["Kiểm tra thị lực sau sử dụng", "Đánh giá mức nhìn ban ngày"],
      ["Kiểm tra giác mạc", "Phát hiện sớm khô, xước hoặc kích ứng"],
      ["Đánh giá độ vừa của kính", "Điều chỉnh khi kính không còn phù hợp"],
      ["Tư vấn thay kính", "Lập kế hoạch theo dõi dài hạn"],
    ],
  },
];

function Section8() {
  const swiperRef = useRef(null);
  const [isOpen, setIsOpen] = useState({ 1: true });
  const [isActive, setIsActive] = useState({ 1: true });

  const handleOpen = (id) => {
    setIsOpen((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleChoose = (id, index) => {
    setIsActive({ [id]: true });
    if (swiperRef.current) {
      swiperRef.current.slideTo(index);
    }
  };

  return (
    <>
      <div className="flex justify-end mr-[2%] mt-[2%]">
        <img src={Circle} alt="Circle" />
      </div>

      <div className="relative 4k:max-w-[75%] md:max-w-[80%] max-w-[95%] pb-[4%] z-[1] mx-auto">
        <div className="grid md:grid-cols-2 grid-cols-1 gap-[2%]">
          <div className="col-span-1">
            <div className="text-lg lg:text-xl text-center xl:text-4xl 4k:text-[38px] font-bold">Những câu hỏi thường gặp</div>
            <div className="mt-3">
              {faqItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`sm:py-[3%] pt-[3%] text-left border-t ${index === faqItems.length - 1 ? "border-b" : ""} border-[#EBEBEB]`}
                >
                  <button
                    type="button"
                    onClick={() => handleOpen(item.id)}
                    className="flex w-full cursor-pointer justify-between items-center gap-3 text-left"
                  >
                    <span className="text-[#252525] font-semibold lg:text-[18px] sm:text-[16px] text-sm">{item.title}</span>
                    <img src={isOpen[item.id] ? Tru : Cong} alt={isOpen[item.id] ? "Đóng" : "Mở"} />
                  </button>
                  <div className={`${isOpen[item.id] ? "max-h-48" : "max-h-0"} overflow-hidden transition-all ease-in-out duration-300`}>
                    <div className="sm:pt-2.5 text-[#454545] sm:text-[16px] text-xs pb-3">
                      {item.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-lg lg:text-xl text-center xl:text-4xl 4k:text-[38px] font-bold">Bảng giá dịch vụ gói Ortho-K</div>
            <div className="flex justify-around overflow-x-auto gap-2 mt-[3%]">
              {orthoPackages.map((item, index) => (
                <div key={item.id} className={`pb-[1.5px] transition-all cursor-pointer duration-300 ease-out ${isActive[item.id] ? "bg_main" : "bg-white"}`}>
                  <button
                    type="button"
                    onClick={() => handleChoose(item.id, index)}
                    className="w-full h-full pb-3 bg-white font-bold 4k:text-[18px] lg:text-[16px] text-[14px] text-sm"
                  >
                    <span className={`${isActive[item.id] ? "bg_main bg-clip-text text-transparent" : "text-[#252525]"} text-nowrap transition-all cursor-pointer duration-200 ease-out`}>
                      {item.title}
                    </span>
                  </button>
                </div>
              ))}
            </div>

            <Swiper
              modules={[Pagination]}
              pagination={{ clickable: true }}
              watchSlidesProgress
              watchOverflow
              grabCursor
              speed={300}
              effect="slide"
              onSwiper={(swiper) => (swiperRef.current = swiper)}
              spaceBetween="2%"
              onSlideChange={(swiper) => {
                const realIndex = swiper.realIndex;
                const activePackageId = orthoPackages[realIndex % orthoPackages.length]?.id;
                if (activePackageId) {
                  setIsActive({ [activePackageId]: true });
                }
              }}
              centeredSlides={false}
              slidesPerView={1}
              className="!px-0 !pb-[10%] mt-[3%]"
            >
              {orthoPackages.map((item) => (
                <SwiperSlide key={item.id} className="h-full shrink-0">
                  <div className="border border-[#EBEBEB] rounded-[20px] overflow-hidden bg-white shadow-sm">
                    <div className="px-4 py-5 text-center sm:px-6">
                      <div className="text-sm font-bold text-[#1588bd]">PHƯƠNG ĐÔNG</div>
                      <h3 className="mt-2 text-2xl font-bold text-[#1588bd] sm:text-3xl">GÓI {item.title}</h3>
                      <p className="mt-1 text-sm text-[#666666]">{item.subtitle}</p>
                    </div>
                    <div className="overflow-x-auto px-3 pb-4 sm:px-5">
                      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-[#1588bd] text-white">
                            <th className="w-14 border border-[#0f6f9d] px-3 py-2 text-center">STT</th>
                            <th className="border border-[#0f6f9d] px-3 py-2">Danh mục khám</th>
                            <th className="border border-[#0f6f9d] px-3 py-2">Mục đích</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.items.map(([name, purpose], index) => (
                            <tr key={name} className="odd:bg-white even:bg-[#f7fbfd]">
                              <td className="border border-[#d9e7ee] px-3 py-2 text-center font-semibold text-[#1588bd]">{index + 1}</td>
                              <td className="border border-[#d9e7ee] px-3 py-2 font-medium text-[#276f91]">{name}</td>
                              <td className="border border-[#d9e7ee] px-3 py-2 text-[#454545]">{purpose}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="border-t border-[#EBEBEB] px-5 py-3 text-sm">
                      <span className="font-semibold">Chi phí dự kiến: </span>
                      <span className="text-[#1588bd]">{item.price}</span>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </>
  );
}

export default Section8;
