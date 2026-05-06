import Section1 from "./Content/Section1";
import Section2 from "./Content/Section2";
import Section3 from "./Content/Section3";
import Section4 from "./Content/Section4";
import Section5 from "./Content/Section5";
import Section6 from "./Content/Section6";
import Section7 from "./Content/Section7";
import Section8 from "./Content/Section8";

import Section9 from "./Content/Section9";

export default function HomeContent() {
  return (
    <>
      <div data-aos="fade-up"><Section1 /></div>
      <div data-aos="fade-left"><Section2 /></div>
      <div data-aos="fade-right"><Section3 /></div>
      <div data-aos="fade-up"><Section4 /></div>
      <div data-aos="fade-left"><Section5 /></div>
      <div data-aos="fade-right"><Section6 /></div>
      <div data-aos="fade-left"><Section7/></div>
      <div data-aos="fade-left"><Section8 /></div>
      <div data-aos="fade-right"><Section9 /></div>
    </>
  );
}