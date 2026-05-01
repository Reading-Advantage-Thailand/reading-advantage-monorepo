import { createSentencesRoute } from "@/lib/games/api";
export const dynamic = "force-static";

const { GET } = createSentencesRoute([
  { id: "1", term: "The brave gryphon flies over the high mountains.", translation: "กริฟฟอนผู้กล้าหาญบินข้ามภูเขาสูง" },
  { id: "2", term: "Watch out for the dangerous dragons in the sky.", translation: "ระวังมังกรที่อันตรายในท้องฟ้า" },
  { id: "3", term: "Collect all the magic orbs to win the game.", translation: "สะสมลูกแก้วเวทมนตร์ทั้งหมดเพื่อชนะเกม" },
  { id: "4", term: "The ancient temple holds many secrets and treasures.", translation: "วิหารโบราณมีความลับและสมบัติมากมาย" },
  { id: "5", term: "The golden sunset paints the clouds in bright colors.", translation: "พระอาทิตย์ตกทองย้อมเมฆเป็นสีสันสดใส" },
  { id: "6", term: "The wise owl watches over the enchanted forest at night.", translation: "นกฮูกฉลาดเฝ้าดูป่าวิเศษในเวลากลางคืน" },
  { id: "7", term: "The brave knight protects the kingdom from dark forces.", translation: "อัศวินผู้กล้าหาญปกป้องอาณาจักรจากกองกำลังมืด" },
  { id: "8", term: "The magic potion grants the drinker extraordinary powers.", translation: "ยาวิเศษให้พลังพิเศษแก่ผู้ดื่ม" },
  { id: "9", term: "The dragon breathes fire across the burning battlefield.", translation: "มังกรพ่นไฟไปทั่วสนามรบที่ลุกไหม้" },
  { id: "10", term: "The crystal ball reveals glimpses of possible futures.", translation: "ลูกแก้ววิเศษเผยให้เห็นอนาคตที่เป็นไปได้" },
  { id: "11", term: "The thunderstorm approaches from the distant mountains.", translation: "พายุฟ้าคะนองกำลังมาจากภูเขาไกล" },
]);

export { GET };
