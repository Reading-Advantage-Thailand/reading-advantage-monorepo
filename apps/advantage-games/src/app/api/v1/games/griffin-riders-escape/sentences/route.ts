import { createSentencesRoute } from "@/lib/games/api";

export const dynamic = "force-static";

const { GET } = createSentencesRoute([
  { term: 'The knight rides the griffin', translation: 'อัศวินขี่กริฟฟิน' },
  { term: 'Sky is blue and wide', translation: 'ท้องฟ้าสีครามและกว้างใหญ่' },
  { term: 'Fly through the golden gates', translation: 'บินผ่านประตูสีทอง' },
  { term: 'Avoid the dark storm clouds', translation: 'หลีกเลี่ยงเมฆพายุที่มืดมิด' },
  { term: 'The griffin soars above clouds', translation: 'กริฟฟินบินเหนือเมฆ' },
  { term: 'Winds carry us to safety', translation: 'สายลมพาเราไปยังที่ปลอดภัย' },
  { term: 'The castle shines in sunlight', translation: 'ปราสาทเปล่งประกายในแสงอาทิตย์' },
  { term: 'Brave heroes fight the dragon', translation: 'วีรบุรุษผู้กล้าต่อสู้กับมังกร' },
  { term: 'Magic feathers fall from sky', translation: 'ขนนกวิเศษตกลงมาจากท้องฟ้า' },
  { term: 'The rider guides the beast home', translation: 'ผู้ขี่นำสัตว์กลับบ้าน' },
]);

export { GET };
