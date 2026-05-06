import Eye from "../../../assets/Section3/Eye.png";
import Like from "../../../assets/Section3/Like.png";
import Kinh from "../../../assets/Section3/Kinh.png";
import Khien from "../../../assets/Section3/Khien.png";
import Theduc from "../../../assets/Section3/Theduc.png";
import Tim from "../../../assets/Section3/Tim.png";

function Section3() {
  const list = [
    {
      id: 1,
      img: Eye,
      title: "Phục hồi thị lực",
    },
    {
      id: 2,
      img: Theduc,
      title: "Tự do hoạt động",
    },
    {
      id: 3,
      img: Kinh,
      title: "Khắc phục khô mắt",
    },
    {
      id: 4,
      img: Khien,
      title: "Không cần phẫu thuật",
    },
    {
      id: 5,
      img: Tim,
      title: "Thị lực được cải thiện",
    },
    {
      id: 6,
      img: Like,
      title: "Sử dụng đơn giản",
    }
  ]
  return (
    <>
      <div className="relative 4k:max-w-[75%] md:max-w-[80%] max-w-[95%] sm:mt-[3%] pb-[5%] mt-[5%] mx-auto">
        <div className="grid sm:grid-cols-3 mb4:grid-cols-2 grid-col-1 sm:gap-y-[15%] mb4:gap-x-[5%] mb4:gap-y-[2%] gap-[1%] ">
          {list.map((item) => (
            // {/* item1 */}
            <div key={item.id} className="col-span-1 grid grid-cols-4 ">
              {/* icon */}
              <div className="col-span-1 mb4:block hidden relative">
                <div className=" bg_main justify-center aspect-[1] flex items-center rounded-tl-[40%] relative z-1 overflow-hidden rounded-br-[40%]">
                  <div className="justify-center h-full flex items-center ">
                    <img src={item.img} alt="Eye" className="z-1 h-[60%] " /></div>
                </div>
              </div>
              {/* text */}
              <div className="col-span-4">
                <div className="sm:pt-3 py-1 flex items-center justify-between gap-x-2 font-bold xl:text-[20px] lg:text-lg text-[18px]">
                  {/* icon <mb4*/}
                  <div className="  relative">
                    {item.title}
                  </div> 
                  <div className=" mb4:hidden bg_main justify-center aspect-[1] flex items-center rounded-tl-[40%] relative z-1 overflow-hidden rounded-br-[40%]">
                      <div className="justify-center h-full flex items-center ">
                        <img src={item.img} alt="Eye" className="z-1 h-[60%] " />
                      </div>
                    </div></div>
                <div className="text-gray-600 sm:pt-2.5 opacity-60  text-justify 2xl:text-lg xl:text-lg lg:text-base text-[14px]">Điều chỉnh độ cận, viễn và thậm chí loạn thị từ nhẹ đến nặng giúp thị lực phục hồi vào ban ngày</div>
              </div>
            </div>

          ))}

        </div>


      </div>

    </>
  )
}
export default Section3;
