/**
 * Word-for-word copy fixture for the www features and pricing rewrite.
 *
 * Every EN string is copied from spec sections 3, 4 and 5 of
 * `11-content/www-features-pricing-spec.md` v1.2 (fact-gate session
 * ses_e04fe2728ffe3xXdHuR56ZneSL; spec commits d123d385, f2eee0cf,
 * 7330789d, 640edec0). Pricing section 4 follows the FP1 stacking rule:
 * four rows only, no 5-subject row, one English program per grade.
 * Every TH string is copied from TH-FP-01 to TH-FP-95 of the Thai check page
 * `11-content/thai-check/2026-11-20-features-pricing.html`, which Daniel checks,
 * except TH-FP-R2-01 to TH-FP-R2-07, which come from spec v1.2 section 4 and
 * go to Daniel's next Thai sitting (PM FP1 hand-off 2026-11-21).
 * Thai values follow the check page (D5): no trailing period.
 * Review A re-checks this file against the sources with a scratch script (plan 1.4).
 * Track: www_features_pricing_20261120.
 */

export interface FixtureEntry {
  /** Thai-check line id, TH-FP-01 to TH-FP-95. */
  id: string;
  /** Section label from the Thai check page. */
  label: string;
  /** English string from the spec. */
  en: string;
  /** Thai string from the Thai check page. */
  th: string;
}

/** Entries 01 to 52 of the Thai check page. */
export const FEATURES_ENTRIES: FixtureEntry[] = [
  { id: "TH-FP-01", label: `S1 eyebrow`, en: `Books, apps and learning for every stage`, th: `หนังสือ แอป และการเรียนรู้ สำหรับทุกช่วงวัย` },
  { id: "TH-FP-02", label: `S1 heading`, en: `One workbook. A whole learning journey.`, th: `เวิร์กบุ๊กหนึ่งเล่ม กับเส้นทางการเรียนรู้ที่ต่อเนื่อง` },
  { id: "TH-FP-03", label: `S1 body 1`, en: `A Thai teacher opens a workbook. Students read, practise and explore with its digital twin.`, th: `ครูไทยเปิดเวิร์กบุ๊ก นักเรียนอ่าน ฝึกฝน และเรียนรู้เพิ่มเติมผ่านแอปที่ทำงานคู่กับหนังสือ` },
  { id: "TH-FP-04", label: `S1 body 2`, en: `Reading Advantage brings together printed workbooks, apps and learning programs for children, families, schools and adults.`, th: `Reading Advantage รวมเวิร์กบุ๊กฉบับพิมพ์ แอป และโปรแกรมการเรียนรู้ไว้ด้วยกัน สำหรับเด็ก ครอบครัว โรงเรียน และผู้ใหญ่` },
  { id: "TH-FP-05", label: `S1 button`, en: `Find the right program`, th: `เลือกโปรแกรมที่เหมาะกับคุณ` },
  { id: "TH-FP-06", label: `S2 heading`, en: `From first stories to adult coding`, th: `จากนิทานเรื่องแรก สู่การเขียนโค้ดสำหรับผู้ใหญ่` },
  { id: "TH-FP-07", label: `S2 body`, en: `A kindergartener follows a story. A primary student reads at their level. A family learns with a local tutor. An adult builds full-stack engineering skills.`, th: `เด็กอนุบาลเรียนรู้ไปกับเรื่องราว นักเรียนประถมอ่านในระดับที่เหมาะกับตนเอง ครอบครัวเรียนกับติวเตอร์ในพื้นที่ และผู้ใหญ่พัฒนาทักษะวิศวกรรมซอฟต์แวร์แบบ full-stack` },
  { id: "TH-FP-08", label: `Storytime card for`, en: `For: Kindergarten Anuban 2 to P2`, th: `เด็กอนุบาล 2 ถึง ป.2` },
  { id: "TH-FP-09", label: `Storytime card status`, en: `Status: Launches 30 November 2026`, th: `เปิดตัววันที่ 30 พฤศจิกายน 2026` },
  { id: "TH-FP-10", label: `Storytime card body`, en: `A teacher leads a 30-minute scripted class. The screen supports the teacher; it never runs the lesson.`, th: `ครูเป็นผู้นำบทเรียนตามสคริปต์ ใช้เวลา 30 นาที หน้าจอช่วยสนับสนุนครู แต่ไม่ได้ทำหน้าที่สอนแทนครู` },
  { id: "TH-FP-11", label: `Storytime bullet 1`, en: `Practise letter formation, phonics and timed sight-word recognition.`, th: `ฝึกเขียนตัวอักษร ฝึกเสียงตัวอักษร และฝึกจำคำศัพท์ที่เห็นบ่อยภายในเวลาที่กำหนด` },
  { id: "TH-FP-12", label: `Storytime bullet 2`, en: `Read along with stories and questions, then recall five items each day.`, th: `อ่านนิทานและตอบคำถามไปด้วยกัน จากนั้นทบทวนสิ่งที่เรียนรู้วันละ 5 รายการ` },
  { id: "TH-FP-13", label: `Storytime bullet 3`, en: `Readers, songs and videos build across the weeks. Families have a home app.`, th: `มีหนังสืออ่าน เพลง และวิดีโอที่ต่อยอดกันไปตลอดหลายสัปดาห์ พร้อมแอปสำหรับใช้ที่บ้าน` },
  { id: "TH-FP-14", label: `Primary card for`, en: `For: English learners in grades P3 to P6`, th: `ผู้เรียนภาษาอังกฤษชั้น ป.3 ถึง ป.6` },
  { id: "TH-FP-15", label: `Primary card status`, en: `Status: Live in schools`, th: `เปิดใช้งานในโรงเรียนแล้ว` },
  { id: "TH-FP-16", label: `Primary card body`, en: `Printed workbooks and an app support leveled reading at CEFR-aligned levels from Pre-A1 to B2.`, th: `เวิร์กบุ๊กฉบับพิมพ์และแอปช่วยสนับสนุนการอ่านแบบแบ่งระดับ ตั้งแต่ Pre-A1 ถึง B2 ซึ่งสอดคล้องกับ CEFR` },
  { id: "TH-FP-17", label: `Primary bullet 1`, en: `Ask a lesson chatbot questions about the passage.`, th: `ถามแชตบอตประจำบทเรียนเกี่ยวกับเนื้อเรื่อง` },
  { id: "TH-FP-18", label: `Primary bullet 2`, en: `Get AI feedback on short and long written answers.`, th: `รับคำแนะนำจาก AI สำหรับคำตอบทั้งแบบสั้นและแบบยาว` },
  { id: "TH-FP-19", label: `Primary bullet 3`, en: `Use 28 games, flashcards, saved words and sentences, text-to-speech and translation.`, th: `ใช้เกม 28 เกม บัตรคำ รายการคำศัพท์และประโยคที่บันทึกไว้ ระบบอ่านข้อความ และเครื่องมือแปลภาษา` },
  { id: "TH-FP-20", label: `Reading card for`, en: `For: Families learning through Tutor Advantage`, th: `ครอบครัวที่เรียนผ่าน Tutor Advantage` },
  { id: "TH-FP-21", label: `Reading card status`, en: `Status: Reading Advantage Origins 2 is on sale through Tutor Advantage.`, th: `Reading Advantage Origins 2 วางจำหน่ายผ่าน Tutor Advantage` },
  { id: "TH-FP-23", label: `CodeCamp card for`, en: `For: Adults building full-stack engineering skills`, th: `ผู้ใหญ่ที่ต้องการพัฒนาทักษะวิศวกรรมซอฟต์แวร์แบบ full-stack` },
  { id: "TH-FP-24", label: `CodeCamp card status`, en: `Status: Live`, th: `เปิดสอนแล้ว` },
  { id: "TH-FP-25", label: `CodeCamp card body`, en: `An adult bootcamp that runs for about 12–15 weeks.`, th: `หลักสูตรเร่งรัดสำหรับผู้ใหญ่ ใช้เวลาประมาณ 12–15 สัปดาห์` },
  { id: "TH-FP-26", label: `Science Math Zhongwen card for`, en: `For: Primary schools`, th: `โรงเรียนประถมศึกษา` },
  { id: "TH-FP-27", label: `Science Math Zhongwen card status`, en: `Status: For the 2027 school year`, th: `สำหรับปีการศึกษา 2027` },
  { id: "TH-FP-28", label: `Science Math Zhongwen card body`, en: `Each subject is planned as an app with printed workbooks, built on the Primary Advantage base.`, th: `เราวางแผนให้แต่ละวิชาเป็นแอปที่ใช้คู่กับเวิร์กบุ๊กฉบับพิมพ์ โดยพัฒนาต่อยอดจากพื้นฐานของ Primary Advantage` },
  { id: "TH-FP-29", label: `S3 heading`, en: `One engine, growing across the curriculum`, th: `หนึ่งเอนจินที่เติบโตไปพร้อมกับหลักสูตร` },
  { id: "TH-FP-30", label: `S3 body`, en: `Mastery Advantage combines Knowledge Space Theory and FSRS spaced repetition. It runs in production in CodeCamp Advantage and is entering Primary Advantage through tagged content.`, th: `Mastery Advantage ผสานทฤษฎีพื้นที่ความรู้ (Knowledge Space Theory) กับระบบทบทวนแบบเว้นระยะ FSRS ปัจจุบันใช้งานจริงใน CodeCamp Advantage และกำลังเข้าสู่ Primary Advantage ผ่านเนื้อหาที่ติดแท็กข้อมูล` },
  { id: "TH-FP-31", label: `S4 heading`, en: `The book stays in the lesson`, th: `เวิร์กบุ๊กยังเป็นส่วนหนึ่งของทุกบทเรียน` },
  { id: "TH-FP-32", label: `S4 body 1`, en: `Blended Learning means printed workbooks and the digital app. Each workbook has 14 lessons and its own digital twin.`, th: `Blended Learning คือการเรียนด้วยเวิร์กบุ๊กฉบับพิมพ์ควบคู่กับแอปดิจิทัล เวิร์กบุ๊กแต่ละเล่มมี 14 บทเรียน และมีแอปที่ทำงานคู่กัน` },
  { id: "TH-FP-33", label: `S4 body 2`, en: `Your teacher leads the class. The app supports the learning experience.`, th: `ครูเป็นผู้นำชั้นเรียน ส่วนแอปช่วยสนับสนุนการเรียนรู้` },
  { id: "TH-FP-34", label: `S5 heading`, en: `One workbook. A local tutor. A small group.`, th: `เวิร์กบุ๊กหนึ่งเล่ม ติวเตอร์ในพื้นที่ และกลุ่มเรียนขนาดเล็ก` },
  { id: "TH-FP-35", label: `S5 body 1`, en: `Tutor Advantage brings families together with a local tutor for a class package of about 22–23 hours.`, th: `Tutor Advantage เชื่อมครอบครัวกับติวเตอร์ในพื้นที่ผ่านแพ็กเกจคลาส ซึ่งใช้เวลาเรียนประมาณ 22–23 ชั่วโมง` },
  { id: "TH-FP-36", label: `S5 body 2`, en: `Reedy voice practice is available on completed lessons for students with an active class package.`, th: `นักเรียนที่มีแพ็กเกจคลาสที่ยังใช้งานอยู่ สามารถฝึกพูดกับ Reedy ในบทเรียนที่เรียนจบแล้วได้` },
  { id: "TH-FP-37", label: `S5 body 3`, en: `Class packages start at 3,000 baht. Prices adapt to the market.`, th: `แพ็กเกจคลาสเริ่มต้นที่ 3,000 บาท ราคาอาจปรับตามตลาด` },
  { id: "TH-FP-38", label: `S5 button`, en: `Explore Tutor Advantage`, th: `ดูเพิ่มเติมเกี่ยวกับ Tutor Advantage` },
  { id: "TH-FP-39", label: `S6 heading`, en: `In the 2027 school year, more subjects join`, th: `ปีการศึกษา 2027 จะมีวิชาใหม่เพิ่มขึ้น` },
  { id: "TH-FP-40", label: `S6 body`, en: `Primary schools can look ahead to Science Advantage, Math Advantage and Zhongwen Advantage: apps with workbooks, each built on the Primary Advantage base.`, th: `โรงเรียนประถมศึกษาสามารถเตรียมพบกับ Science Advantage, Math Advantage และ Zhongwen Advantage ซึ่งวางแผนเป็นแอปที่ใช้คู่กับเวิร์กบุ๊ก และพัฒนาต่อยอดจากพื้นฐานของ Primary Advantage` },
  { id: "TH-FP-41", label: `S7 heading`, en: `A growing family of apps`, th: `ครอบครัวแอปที่เติบโตขึ้นเรื่อย ๆ` },
  { id: "TH-FP-42", label: `S7 body`, en: `We aim to open a new Advantage app every month, led by Storytime Advantage.`, th: `เราตั้งเป้าเปิดตัวแอป Advantage ใหม่ทุกเดือน โดยเริ่มจาก Storytime Advantage` },
  { id: "TH-FP-43", label: `S8 heading`, en: `Questions from families and schools`, th: `คำถามจากครอบครัวและโรงเรียน` },
  { id: "TH-FP-44", label: `S8 Q1`, en: `Q: Which app fits which age?`, th: `แอปใดเหมาะกับเด็กช่วงวัยไหน?` },
  { id: "TH-FP-45", label: `S8 A1`, en: `A: Storytime Advantage is for kindergarten Anuban 2 to P2. Primary Advantage is for English learners in grades P3 to P6.`, th: `Storytime Advantage เหมาะสำหรับเด็กอนุบาล 2 ถึง ป.2 ส่วน Primary Advantage เหมาะสำหรับผู้เรียนภาษาอังกฤษชั้น ป.3 ถึง ป.6` },
  { id: "TH-FP-46", label: `S8 Q2`, en: `Q: Does the screen teach for the teacher?`, th: `หน้าจอสอนแทนครูหรือไม่?` },
  { id: "TH-FP-47", label: `S8 A2`, en: `A: No. In Storytime Advantage, the teacher leads the lesson and the screen supports the teacher.`, th: `ไม่ใช่ ใน Storytime Advantage ครูเป็นผู้นำบทเรียน และหน้าจอช่วยสนับสนุนครู` },
  { id: "TH-FP-48", label: `S8 Q3`, en: `Q: When do the new subjects open?`, th: `วิชาใหม่จะเปิดเมื่อไร?` },
  { id: "TH-FP-49", label: `S8 A3`, en: `A: Science Advantage, Math Advantage and Zhongwen Advantage are planned for primary schools in the 2027 school year.`, th: `เราวางแผนให้ Science Advantage, Math Advantage และ Zhongwen Advantage สำหรับโรงเรียนประถมศึกษาเปิดในปีการศึกษา 2027` },
  { id: "TH-FP-50", label: `S9 heading`, en: `Let's plan the next step`, th: `มาวางแผนก้าวต่อไปด้วยกัน` },
  { id: "TH-FP-51", label: `S9 body`, en: `Tell us about your learners or your school. We'll help you explore the programs and books that fit.`, th: `เล่าให้ฟังเกี่ยวกับผู้เรียนหรือโรงเรียนของคุณ เราจะช่วยดูว่าโปรแกรมและหนังสือแบบใดเหมาะกับคุณ` },
  { id: "TH-FP-52", label: `S9 button`, en: `Talk with our team`, th: `พูดคุยกับทีมงานของเรา` },
];

/** Entries 55 to 92 of the Thai check page. */
export const PRICING_ENTRIES: FixtureEntry[] = [
  { id: "TH-FP-55", label: `S1 eyebrow`, en: `School pricing`, th: `ราคาสำหรับโรงเรียน` },
  { id: "TH-FP-56", label: `S1 heading`, en: `Plan next year's subjects. See the price clearly.`, th: `วางแผนวิชาสำหรับปีหน้า พร้อมดูราคาได้ชัดเจน` },
  { id: "TH-FP-57", label: `S1 body 1`, en: `Each grade picks one English program: Storytime Advantage, Primary Advantage, or Reading Advantage. Each English program is priced on its own. Schools add more subjects for the same students.`, th: `แต่ละชั้นเลือกโปรแกรมภาษาอังกฤษหนึ่งโปรแกรม: Storytime Advantage, Primary Advantage หรือ Reading Advantage แต่ละโปรแกรมคิดราคาแยกกัน และเพิ่มวิชาได้อีกสำหรับนักเรียนกลุ่มเดียวกัน` },
  { id: "TH-FP-58", label: `S1 body 2`, en: `The school price covers the app, teacher training and support. Printed workbooks are priced separately.`, th: `ราคาสำหรับโรงเรียนรวมแอป การอบรมครู และการสนับสนุนแล้ว ส่วนเวิร์กบุ๊กฉบับพิมพ์คิดราคาแยกต่างหาก` },
  { id: "TH-FP-59", label: `S2 heading`, en: `Add subjects along one clear curve`, th: `เพิ่มวิชาได้ตามอัตราค่าบริการที่ชัดเจน` },
  { id: "TH-FP-60", label: `S2 body`, en: `Each total is per student per year for the app, teacher training and support.`, th: `ราคารวมเป็นราคาต่อนักเรียนหนึ่งคนต่อปี สำหรับแอป การอบรมครู และการสนับสนุน` },
  { id: "TH-FP-61", label: `S2 columns`, en: `Subjects | Added per subject | Total per student per year`, th: `จำนวนวิชา | เพิ่มต่อวิชา | ราคารวมต่อนักเรียนหนึ่งคนต่อปี` },
  { id: "TH-FP-62", label: `S2 row 1`, en: `1 subject | 1,200 baht | 1,200 baht`, th: `1 วิชา | 1,200 บาท | 1,200 บาท` },
  { id: "TH-FP-63", label: `S2 row 2`, en: `2 subjects | +600 baht | 1,800 baht`, th: `2 วิชา | +600 บาท | 1,800 บาท` },
  { id: "TH-FP-64", label: `S2 row 3`, en: `3 subjects | +400 baht | 2,200 baht`, th: `3 วิชา | +400 บาท | 2,200 บาท` },
  { id: "TH-FP-65", label: `S2 row 4`, en: `4 subjects | +250 baht | 2,450 baht`, th: `4 วิชา | +250 บาท | 2,450 บาท` },
  { id: "TH-FP-67", label: `S2 note`, en: `Each total counts the same students in the same grades. A school picks one English program per grade, then adds subjects on the same curve.`, th: `ราคารวมแต่ละขั้นนับนักเรียนกลุ่มเดียวกันในชั้นเดียวกัน โรงเรียนเลือกโปรแกรมภาษาอังกฤษหนึ่งโปรแกรมต่อหนึ่งชั้น แล้วเพิ่มวิชาตามอัตราค่าบริการเดียวกัน` },
  { id: "TH-FP-68", label: `S3 heading`, en: `Primary Advantage plus Math Advantage for the same students: 1,800 baht`, th: `Primary Advantage บวก Math Advantage สำหรับนักเรียนกลุ่มเดียวกัน: 1,800 บาท` },
  { id: "TH-FP-69", label: `S3 body 1`, en: `A school that chooses Primary Advantage English and Math Advantage for the same students pays 1,800 baht per student per year for the app, teacher training and support.`, th: `โรงเรียนที่เลือกภาษาอังกฤษผ่าน Primary Advantage และ Math Advantage สำหรับนักเรียนกลุ่มเดียวกัน จ่าย 1,800 บาทต่อนักเรียนหนึ่งคนต่อปี สำหรับแอป การอบรมครู และการสนับสนุน` },
  { id: "TH-FP-70", label: `S3 body 2`, en: `Printed workbooks are quoted separately, per book.`, th: `เวิร์กบุ๊กฉบับพิมพ์เสนอราคาแยกเป็นรายเล่ม` },
  { id: "TH-FP-71", label: `S4 heading`, en: `App, training and support`, th: `แอป การอบรม และการสนับสนุน` },
  { id: "TH-FP-72", label: `S4 bullet 1`, en: `Access to the subject app.`, th: `เข้าใช้งานแอปประจำวิชา` },
  { id: "TH-FP-73", label: `S4 bullet 2`, en: `Teacher training.`, th: `การอบรมครู` },
  { id: "TH-FP-74", label: `S4 bullet 3`, en: `Support.`, th: `การสนับสนุน` },
  { id: "TH-FP-75", label: `S5 heading`, en: `Books are priced separately`, th: `หนังสือคิดราคาแยกต่างหาก` },
  { id: "TH-FP-76", label: `S5 body`, en: `Printed workbooks are priced per book, by quotation.`, th: `เวิร์กบุ๊กฉบับพิมพ์คิดราคาเป็นรายเล่ม โดยเสนอราคาแยกต่างหาก` },
  { id: "TH-FP-77", label: `S6 heading`, en: `Start with English. Plan for more.`, th: `เริ่มจากภาษาอังกฤษ แล้ววางแผนเพิ่มวิชา` },
  { id: "TH-FP-78", label: `S6 body`, en: `Schools start with one English program per grade. Science Advantage, Math Advantage and Zhongwen Advantage are planned for the 2027 school year.`, th: `โรงเรียนเริ่มด้วยโปรแกรมภาษาอังกฤษหนึ่งโปรแกรมต่อหนึ่งชั้น ส่วน Science Advantage, Math Advantage และ Zhongwen Advantage วางแผนไว้สำหรับปีการศึกษา 2027` },
  { id: "TH-FP-79", label: `S7 heading`, en: `For families, learning happens with a local tutor`, th: `ครอบครัวเรียนรู้ไปกับติวเตอร์ในพื้นที่` },
  { id: "TH-FP-80", label: `S7 body`, en: `A Tutor Advantage class package includes one printed workbook and about 22–23 hours with a local tutor. Packages start at 3,000 baht and adapt to the market.`, th: `แพ็กเกจคลาสของ Tutor Advantage ประกอบด้วยเวิร์กบุ๊กฉบับพิมพ์หนึ่งเล่ม และเวลาเรียนกับติวเตอร์ในพื้นที่ประมาณ 22–23 ชั่วโมง แพ็กเกจเริ่มต้นที่ 3,000 บาท และราคาอาจปรับตามตลาด` },
  { id: "TH-FP-81", label: `S7 button`, en: `Explore Tutor Advantage`, th: `ดูเพิ่มเติมเกี่ยวกับ Tutor Advantage` },
  { id: "TH-FP-82", label: `S8 body`, en: `A fuller service is in planning; we will share it when it is ready.`, th: `บริการที่ครบขึ้นอยู่ระหว่างการวางแผน เราจะแจ้งให้ทราบเมื่อพร้อม` },
  { id: "TH-FP-83", label: `S9 heading`, en: `Questions about school and family pricing`, th: `คำถามเกี่ยวกับราคาสำหรับโรงเรียนและครอบครัว` },
  { id: "TH-FP-84", label: `S9 Q1`, en: `Q: What counts as a subject?`, th: `วิชาใดบ้างที่นับรวมในราคา?` },
  { id: "TH-FP-85", label: `S9 A1`, en: `A: Each subject counts once toward the per-student yearly total. English counts once, through the one English program of that grade. Science Advantage, Math Advantage and Zhongwen Advantage are planned for the 2027 school year.`, th: `วิชาแต่ละวิชาในหลักสูตรของโรงเรียนนับรวมหนึ่งครั้งในราคารายปีต่อนักเรียนหนึ่งคน วิชาภาษาอังกฤษนับหนึ่งครั้งผ่านโปรแกรมภาษาอังกฤษประจำชั้นนั้น ส่วน Science Advantage, Math Advantage และ Zhongwen Advantage วางแผนไว้สำหรับปีการศึกษา 2027` },
  { id: "TH-FP-86", label: `S9 Q2`, en: `Q: Are printed books included in the school price?`, th: `ราคาสำหรับโรงเรียนรวมหนังสือฉบับพิมพ์หรือไม่?` },
  { id: "TH-FP-87", label: `S9 A2`, en: `A: No. Printed workbooks are priced separately, per book, by quotation.`, th: `ไม่รวม เวิร์กบุ๊กฉบับพิมพ์คิดราคาแยกเป็นรายเล่ม โดยเสนอราคาแยกต่างหาก` },
  { id: "TH-FP-88", label: `S9 Q3`, en: `Q: What about families?`, th: `แล้วครอบครัวมีทางเลือกอย่างไร?` },
  { id: "TH-FP-89", label: `S9 A3`, en: `A: Families can choose Tutor Advantage. A class package includes one printed workbook and about 22–23 hours with a local tutor. Packages start at 3,000 baht.`, th: `ครอบครัวเลือก Tutor Advantage ได้ แพ็กเกจคลาสประกอบด้วยเวิร์กบุ๊กฉบับพิมพ์หนึ่งเล่ม และเวลาเรียนกับติวเตอร์ในพื้นที่ประมาณ 22–23 ชั่วโมง แพ็กเกจเริ่มต้นที่ 3,000 บาท` },
  { id: "TH-FP-90", label: `S10 heading`, en: `Build your school's subject plan`, th: `วางแผนวิชาสำหรับโรงเรียนของคุณ` },
  { id: "TH-FP-91", label: `S10 body`, en: `Tell us which subjects you want to offer. We'll help you map the annual per-student price and request workbook quotations.`, th: `บอกเราว่าโรงเรียนต้องการเปิดสอนวิชาใดบ้าง เราจะช่วยคำนวณราคารายปีต่อนักเรียนหนึ่งคน และขอใบเสนอราคาเวิร์กบุ๊กให้คุณ` },
  { id: "TH-FP-92", label: `S10 button`, en: `Plan your school program`, th: `วางแผนหลักสูตรของโรงเรียน` },
];

/** /features Meta title and description (TH-FP-53, TH-FP-54). */
export const FEATURES_META = {
  titleEn: `Reading Advantage | Books, Apps and Learning Programs`,
  titleTh: `Reading Advantage | หนังสือ แอป และโปรแกรมการเรียนรู้`,
  descriptionEn: `Explore Storytime, Primary and Reading Advantage, Tutor Advantage, CodeCamp Advantage, and new school subjects planned for 2027.`,
  descriptionTh: `ทำความรู้จัก Storytime Advantage, Primary Advantage, Reading Advantage, Tutor Advantage, CodeCamp Advantage และวิชาใหม่สำหรับโรงเรียนที่วางแผนไว้ในปี 2027`,
};

/** /pricing Meta title and description (TH-FP-93, TH-FP-94). */
export const PRICING_META = {
  titleEn: `School Pricing | Reading Advantage`,
  titleTh: `ราคาสำหรับโรงเรียน | Reading Advantage`,
  descriptionEn: `See the per-student yearly price for school subjects, what it includes, and how printed workbooks and Tutor Advantage are priced.`,
  descriptionTh: `ดูราคาต่อปีต่อนักเรียนหนึ่งคนสำหรับวิชาของโรงเรียน รายการที่รวมอยู่ในราคา และราคาเวิร์กบุ๊กฉบับพิมพ์กับ Tutor Advantage`,
};

/** managed-service roadmap.description pair (TH-FP-95, spec section 5). */
export const MANAGED_ROADMAP = {
  en: `Our school programs bring printed workbooks and digital apps together. A fuller service is in planning; we will share it when it is ready.`,
  th: `โปรแกรมสำหรับโรงเรียนของเราใช้เวิร์กบุ๊กฉบับพิมพ์ควบคู่กับแอปดิจิทัล บริการที่ครบขึ้นอยู่ระหว่างการวางแผน เราจะแจ้งให้ทราบเมื่อพร้อม`,
};

/** Price-table columns (TH-FP-61), split on " | ". */
export const PRICE_COLUMNS_EN: string[] = [
  `Subjects`,
  `Added per subject`,
  `Total per student per year`,
];
export const PRICE_COLUMNS_TH: string[] = [
  `จำนวนวิชา`,
  `เพิ่มต่อวิชา`,
  `ราคารวมต่อนักเรียนหนึ่งคนต่อปี`,
];

/** Price-table rows (TH-FP-62 to TH-FP-65), each split on " | ". */
export const PRICE_ROWS_EN: string[][] = [
  [`1 subject`, `1,200 baht`, `1,200 baht`],
  [`2 subjects`, `+600 baht`, `1,800 baht`],
  [`3 subjects`, `+400 baht`, `2,200 baht`],
  [`4 subjects`, `+250 baht`, `2,450 baht`],
];
export const PRICE_ROWS_TH: string[][] = [
  [`1 วิชา`, `1,200 บาท`, `1,200 บาท`],
  [`2 วิชา`, `+600 บาท`, `1,800 บาท`],
  [`3 วิชา`, `+400 บาท`, `2,200 บาท`],
  [`4 วิชา`, `+250 บาท`, `2,450 บาท`],
];

/** Every EN and TH string of spec sections 3 and 4, in check-page order. */
export const ALL_FEATURES_STRINGS_EN: string[] = FEATURES_ENTRIES.map((entry) => entry.en);
export const ALL_FEATURES_STRINGS_TH: string[] = FEATURES_ENTRIES.map((entry) => entry.th);
export const ALL_PRICING_STRINGS_EN: string[] = PRICING_ENTRIES.map((entry) => entry.en);
export const ALL_PRICING_STRINGS_TH: string[] = PRICING_ENTRIES.map((entry) => entry.th);

/** Removed strings (FR-16): no locale value under src/locales/ may hold one. */
export const REMOVED_STRINGS: string[] = [
  `Raz-Kids`,
  `Lexia`,
  `Accelerated Reader`,
  `Achieve3000`,
  `Copy reviewed`,
  `ทบทวนข้อความเมื่อ`,
  `文案审核日期`,
  `Want to see Reading Advantage?`,
  `1,000 baht`,
  `1,500 baht`,
  `1,000 บาท`,
  `1,500 บาท`,
  `需报价`,
  `App-Only`,
  `Contact us for current pricing`,
];

/** Scope guards (AC-8): literal values at master 4da73415d that stay unchanged. */
export const ZH_MANAGED_SERVICE_DESCRIPTION =
  "托管服务暂未提供。是否推出取决于学校需求。我们接受感兴趣学校的询问，目前没有确定日期。";
export const HEADER_LABELS = {
  enFeatures: "Features",
  enPricing: "Pricing",
  thFeatures: "คุณสมบัติ",
  thPricing: "ราคา",
  zhFeatures: "功能",
  zhPricing: "价格",
} as const;

/** Product ids of the S7 logo tiles, Storytime first (D8). */
export const APP_LOGO_ORDER: string[] = [
  "storytime",
  "primary",
  "reading",
  "tutor",
  "science",
  "math",
  "zhongwen",
];
