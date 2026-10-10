# Primary cutover 2026-10-11: dev handoff / ส่งต่องานให้ผู้พัฒนา

Full report / รายงานฉบับเต็ม: `cutover-readiness-20261008.bilingual.html` (this folder / โฟลเดอร์นี้)
Steps / ขั้นตอน: `cutover-commands-20261011.md`, `docs/deployment/primary-cutover-migration-spec.md` 1.10

## Status / สถานะ

Rehearsal 2 passed on the frozen build `cfef79c88`. The cutover is on Sunday 2026-10-11, evening.
The cutover deploys the rehearsal 2 image. There is no new build.

การซ้อมครั้งที่ 2 ผ่านบน build ที่ล็อกแล้ว `cfef79c88` วันตัดโอนคือวันอาทิตย์ 2026-10-11 ช่วงเย็น
การตัดโอน deploy image จากการซ้อมครั้งที่ 2 ไม่มี build ใหม่

## Rules until Sunday / กฎจนถึงวันอาทิตย์

- [ ] Do not change the Primary build inputs. A change needs a new rehearsal.
      ห้ามเปลี่ยนอินพุตการ build ของ Primary หากเปลี่ยนต้องซ้อมใหม่
- [ ] Submit the ETL build with `--region=asia-southeast1`.
      ส่ง build ของ ETL ด้วย `--region=asia-southeast1`
- [ ] Run no heavy local job during the checks. The machine has 7 GB of memory.
      ห้ามรันงานหนักในเครื่องระหว่างการตรวจ เครื่องมีหน่วยความจำ 7 GB

## Tasks / งาน

### 1. Article UUIDs change in every ETL run / UUID บทความเปลี่ยนทุกครั้งที่รัน ETL

Example: `quest-4/l12` has a different UUID in rehearsal 1 and in rehearsal 2. The final ETL creates new UUIDs again.
Code, links, and tests must not store a rehearsal UUID. Use the legacy cuid. `primary_legacy_id_map` resolves it.

ตัวอย่าง: `quest-4/l12` มี UUID ต่างกันในการซ้อมครั้งที่ 1 และ 2 ETL สุดท้ายสร้าง UUID ใหม่อีกครั้ง
โค้ด ลิงก์ และการทดสอบต้องไม่เก็บ UUID จากการซ้อม ให้ใช้ cuid เดิม ซึ่ง `primary_legacy_id_map` แปลงให้

Acceptance / เกณฑ์ผ่าน:
- [x] No repo file, script, or Tutor setting holds a rehearsal article UUID (checked 2026-10-10).
      ไม่มีไฟล์ สคริปต์ หรือค่าตั้งของ Tutor ที่เก็บ UUID บทความจากการซ้อม (ตรวจเมื่อ 2026-10-10)
- [x] The repo search found none in the runbooks, the Primary tracks, and the scripts (checked 2026-10-09). The Tutor repo and the Cloud Run settings are checked (2026-10-10, read only):
      การค้นหาใน repo นี้ไม่พบใน runbook แทร็ก Primary และสคริปต์ (ตรวจเมื่อ 2026-10-09) ตรวจ repo ของ Tutor และค่าตั้งของ Cloud Run แล้ว (2026-10-10 อ่านอย่างเดียว):
  - Cloud Run: the Primary service and its 128 revisions; the 6 Tutor services (project `reading-advantage`) and their revisions. Every UUID there is a Cloud Run ID (operation, service, build), not an article.
    Cloud Run: service ของ Primary และ revision ทั้ง 128 รายการ; service ของ Tutor 6 ตัว (โปรเจกต์ `reading-advantage`) และ revision ทุก UUID ในนั้นเป็น ID ของ Cloud Run (operation, service, build) ไม่ใช่บทความ
  - Tutor repo `origin/main` 4435ea9: no Primary article UUID (the UUIDs are in the Tutor seed, tests, and a dev login).
    repo ของ Tutor `origin/main` 4435ea9: ไม่มี UUID บทความของ Primary (UUID อยู่ใน seed การทดสอบ และ dev login ของ Tutor)
  - This repo at b4378613a: no rehearsal 1 or rehearsal 2 article UUID. Two unit tests and two dated records hold article UUIDs of the test copy `primary_etl_20261007`. The tests use a mock database, so the cutover does not affect them. Optional: replace them after the freeze.
    repo นี้ที่ b4378613a: ไม่มี UUID บทความจากการซ้อมครั้งที่ 1 หรือ 2 การทดสอบหน่วยสองไฟล์และบันทึกที่ลงวันที่สองไฟล์มี UUID บทความจากสำเนาทดสอบ `primary_etl_20261007` การทดสอบใช้ฐานข้อมูลจำลอง การตัดโอนจึงไม่กระทบ ไม่บังคับ: เปลี่ยนหลังช่วงล็อก
  - The rehearsal UUIDs are only in the link-check logs in `~/Desktop/primary-cutover-inputs`. The check scripts in `.qa-tmp` hold none.
    UUID จากการซ้อมอยู่เฉพาะใน log การตรวจลิงก์ใน `~/Desktop/primary-cutover-inputs` สคริปต์ตรวจใน `.qa-tmp` ไม่มี

### 2. Tutor on the new database / Tutor บนฐานข้อมูลใหม่

Decision 4: Tutor keeps the legacy database on Sunday. Tutor switches after its staging check, in the first week.
The read check through `tutor_compat` passed: 625 articles, MATCH. The Tutor app itself is not tested on the new database.

การตัดสินใจข้อ 4: Tutor ใช้ฐานข้อมูลเดิมในวันอาทิตย์ แล้วสลับหลังการตรวจบน staging ในสัปดาห์แรก
การตรวจการอ่านผ่าน `tutor_compat` ผ่านแล้ว: 625 บทความ MATCH แต่ยังไม่ได้ทดสอบตัวแอป Tutor บนฐานข้อมูลใหม่

Acceptance / เกณฑ์ผ่าน:
- [ ] Tutor staging opens 3 Origins 3.1 lessons and 1 Origins 2 lesson from the new database.
      Tutor บน staging เปิดบทเรียน Origins 3.1 จำนวน 3 บทและ Origins 2 จำนวน 1 บทจากฐานข้อมูลใหม่
- [ ] The owner gives the go before the switch.
      เจ้าของให้ go ก่อนการสลับ

### 3. Demo class names (optional) / ชื่อในห้องเดโม (ไม่บังคับ)

The name list of the demo class shows "Student (." five times. The five demo students have the first name "Student". The list adds the first letter of the last word, which is "(".
This does not block the cutover. A student of the demo class picks by position. No real class has this problem.

รายชื่อห้องเดโมแสดง "Student (." ห้าครั้ง นักเรียนเดโมห้าคนมีชื่อต้นว่า "Student" รายชื่อเติมตัวอักษรแรกของคำสุดท้าย ซึ่งคือ "("
ไม่ขวางการตัดโอน นักเรียนในห้องเดโมเลือกตามตำแหน่ง ห้องจริงไม่มีปัญหานี้

Options / ตัวเลือก (the owner chooses / เจ้าของเลือก):
- [ ] Rename the five demo students in the app after the cutover (data change, no build).
      เปลี่ยนชื่อนักเรียนเดโมทั้งห้าในแอปหลังตัดโอน (แก้ข้อมูล ไม่ต้อง build)
- [ ] Fix the label code after the freeze.
      แก้โค้ดป้ายชื่อหลังช่วงล็อก

## Sunday steps for the dev / ขั้นตอนของวันอาทิตย์ที่เกี่ยวกับผู้พัฒนา

| # | Step / ขั้นตอน |
|---|---|
| C2 | Turn off the legacy build trigger `primary-advantege-prod`, before C9. A push to the legacy `main` deploys the legacy app over the new app. / ปิด build trigger ของระบบเดิม `primary-advantege-prod` ก่อน C9 การ push ไปที่ `main` เดิมจะ deploy แอปเดิมทับแอปใหม่ |
| C5 | Merge `primary-parity-integration` into `master`; push both branches / merge แล้ว push ทั้งสอง branch |
| C7 | Gate first: the `latest` version of `PRIMARY_V2_DATABASE_URL` must be version 1, because C9 pins `:1` / ตรวจก่อน: เวอร์ชัน `latest` ของ `PRIMARY_V2_DATABASE_URL` ต้องเป็นเวอร์ชัน 1 เพราะ C9 ตรึง `:1` |
| C9 | Deploy the rehearsal 2 image with the secret version pinned, no traffic, tag `cutover` / deploy image จากการซ้อมครั้งที่ 2 ตรึงเวอร์ชัน secret ไม่รับทราฟฟิก แท็ก `cutover` |
| C10 | Set `BASE` to the `cutover` tag URL. Without `BASE`, the check script uses `localhost:3000` / ตั้ง `BASE` เป็น URL ของแท็ก `cutover` ถ้าไม่ตั้ง สคริปต์ตรวจจะใช้ `localhost:3000` |
| C12 | Check that 100% of the traffic goes to the `cutover` revision / ตรวจว่าทราฟฟิก 100% ไปที่ revision ของแท็ก `cutover` |

Owner only: C6, C8, and the go before C11. / เฉพาะเจ้าของ: C6, C8 และการให้ go ก่อน C11

Rollback (within 24 hours / ภายใน 24 ชั่วโมง): route the traffic back to revision `primary-advantage-app-00125-9wd`. Data written to the new database after the switch is lost. Only the owner decides a rollback.
ส่งทราฟฟิกกลับไปที่ revision `primary-advantage-app-00125-9wd` ข้อมูลที่เขียนลงฐานข้อมูลใหม่หลังการสลับจะสูญหาย เจ้าของเท่านั้นตัดสินใจ rollback

## After the cutover / หลังการตัดโอน

- Graph: tags backfill on the new database before the evidence worker starts (runbook step 11).
  Graph: backfill แท็กบนฐานข้อมูลใหม่ก่อนที่ evidence worker เริ่มทำงาน (runbook ข้อ 11)
- Workbooks: the injector writes new lessons into the new database.
  Workbooks: injector เขียนบทเรียนใหม่ลงฐานข้อมูลใหม่
- The feature freeze ends. / ช่วงล็อกฟีเจอร์สิ้นสุด
