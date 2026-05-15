import { describe, it, expect } from "vitest";
import { loadMessages } from "../i18n-messages";
import type { NestedMessages } from "../i18n-messages";

describe("admin translation keys", () => {
  it("en locale has all admin keys", async () => {
    const messages = (await loadMessages("en")) as NestedMessages;
    const admin = messages.admin as NestedMessages;
    expect(admin.title as string).toBe("Intern Management");
    expect(admin.interns as string).toBe("Interns");
    expect(admin.addIntern as string).toBe("Add Intern");
    expect(admin.overview as string).toBe("Overview");
    expect(admin.progress as string).toBe("Progress");
    expect(admin.prReviews as string).toBe("PR Reviews");
    expect(admin.username as string).toBe("Username");
    expect(admin.name as string).toBe("Name");
    expect(admin.lastActive as string).toBe("Last Active");
    expect(admin.noInterns as string).toBe("No interns yet");
    expect(admin.createIntern as string).toBe("Create Intern Account");
    expect(admin.backToOverview as string).toBe("Back to Overview");
    expect(admin.accessDenied as string).toBe("Access Denied");
    expect(admin.noPrivileges as string).toBe("You need admin privileges to view this page.");
    expect(admin.backToDashboard as string).toBe("Back to Dashboard");
    expect(admin.dashboardTitle as string).toBe("Admin Dashboard");
    expect(admin.dashboardSubtitle as string).toBe("Manage intern accounts and track cohort progress");
    expect(admin.newIntern as string).toBe("New Intern");
    expect(admin.totalInterns as string).toBe("Total Interns");
    expect(admin.avgProgress as string).toBe("Avg. Progress");
    expect(admin.pendingReviews as string).toBe("Pending Reviews");
    expect(admin.cohortOverview as string).toBe("Cohort Overview");
    expect(admin.modules as string).toBe("Modules");
    expect(admin.quizAvg as string).toBe("Quiz Avg");
    expect(admin.actions as string).toBe("Actions");
    expect(admin.details as string).toBe("Details");
    expect(admin.never as string).toBe("Never");
    expect(admin.backToAdmin as string).toBe("Back to Admin");
    expect(admin.internNotFound as string).toBe("Intern not found");
    expect(admin.moduleProgress as string).toBe("Module Progress");
    expect(admin.lessonsLabel as string).toBe("lessons");
    expect(admin.avgLabel as string).toBe("Avg:");
    expect(admin.quizScores as string).toBe("Quiz Scores");
    expect(admin.displayName as string).toBe("Display Name");
    expect(admin.initialPassword as string).toBe("Initial Password");
    expect(admin.usernameHint as string).toBe("Used for login. Must be unique.");
    expect(admin.passwordHint as string).toBe("Minimum 8 characters. The intern can change this after first login.");
    expect(admin.creating as string).toBe("Creating...");
    expect(admin.cancel as string).toBe("Cancel");
    expect(admin.createInternDescription as string).toBe("Create a new intern account. The intern will be able to log in with the username and password you set.");
    const empty = admin.empty as NestedMessages;
    expect(empty.createToStart as string).toBe("Create intern accounts to get started.");
  });

  it("th locale has all admin keys", async () => {
    const messages = (await loadMessages("th")) as NestedMessages;
    const admin = messages.admin as NestedMessages;
    expect(admin.title as string).toBe("จัดการผู้ฝึกงาน");
    expect(admin.interns as string).toBe("ผู้ฝึกงาน");
    expect(admin.addIntern as string).toBe("เพิ่มผู้ฝึกงาน");
    expect(admin.overview as string).toBe("ภาพรวม");
    expect(admin.progress as string).toBe("ความคืบหน้า");
    expect(admin.prReviews as string).toBe("รีวิว PR");
    expect(admin.username as string).toBe("ชื่อผู้ใช้");
    expect(admin.name as string).toBe("ชื่อ");
    expect(admin.lastActive as string).toBe("ใช้งานล่าสุด");
    expect(admin.noInterns as string).toBe("ยังไม่มีผู้ฝึกงาน");
    expect(admin.createIntern as string).toBe("สร้างบัญชีผู้ฝึกงาน");
    expect(admin.backToOverview as string).toBe("กลับไปหน้าภาพรวม");
    expect(admin.accessDenied as string).toBe("การเข้าถึงถูกปฏิเสธ");
    expect(admin.noPrivileges as string).toBe("คุณต้องมีสิทธิ์ผู้ดูแลระบบเพื่อดูหน้านี้");
    expect(admin.backToDashboard as string).toBe("กลับไปแดชบอร์ด");
    expect(admin.dashboardTitle as string).toBe("แดชบอร์ดผู้ดูแลระบบ");
    expect(admin.dashboardSubtitle as string).toBe("จัดการบัญชีผู้ฝึกงานและติดตามความคืบหน้าของกลุ่ม");
    expect(admin.newIntern as string).toBe("ผู้ฝึกงานใหม่");
    expect(admin.totalInterns as string).toBe("จำนวนผู้ฝึกงานทั้งหมด");
    expect(admin.avgProgress as string).toBe("ความคืบหน้าเฉลี่ย");
    expect(admin.pendingReviews as string).toBe("รีวิวที่รอการตรวจ");
    expect(admin.cohortOverview as string).toBe("ภาพรวมกลุ่ม");
    expect(admin.modules as string).toBe("โมดูล");
    expect(admin.quizAvg as string).toBe("คะแนนสอบเฉลี่ย");
    expect(admin.actions as string).toBe("การดำเนินการ");
    expect(admin.details as string).toBe("รายละเอียด");
    expect(admin.never as string).toBe("ไม่เคย");
    expect(admin.backToAdmin as string).toBe("กลับไปหน้าผู้ดูแลระบบ");
    expect(admin.internNotFound as string).toBe("ไม่พบผู้ฝึกงาน");
    expect(admin.moduleProgress as string).toBe("ความคืบหน้าโมดูล");
    expect(admin.lessonsLabel as string).toBe("บทเรียน");
    expect(admin.avgLabel as string).toBe("เฉลี่ย:");
    expect(admin.quizScores as string).toBe("คะแนนแบบทดสอบ");
    expect(admin.displayName as string).toBe("ชื่อที่แสดง");
    expect(admin.initialPassword as string).toBe("รหัสผ่านเริ่มต้น");
    expect(admin.usernameHint as string).toBe("ใช้สำหรับเข้าสู่ระบบ ต้องไม่ซ้ำกับผู้อื่น");
    expect(admin.passwordHint as string).toBe("อย่างน้อย 8 ตัวอักษร ผู้ฝึกงานสามารถเปลี่ยนได้หลังจากเข้าสู่ระบบครั้งแรก");
    expect(admin.creating as string).toBe("กำลังสร้าง...");
    expect(admin.cancel as string).toBe("ยกเลิก");
    expect(admin.createInternDescription as string).toBe("สร้างบัญชีผู้ฝึกงานใหม่ ผู้ฝึกงานจะสามารถเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านที่คุณตั้ง");
    const empty = admin.empty as NestedMessages;
    expect(empty.createToStart as string).toBe("สร้างบัญชีผู้ฝึกงานเพื่อเริ่มต้น");
  });

  it("th admin keys differ from en (not duplicated English)", async () => {
    const enMessages = (await loadMessages("en")) as NestedMessages;
    const thMessages = (await loadMessages("th")) as NestedMessages;
    const enAdmin = enMessages.admin as NestedMessages;
    const thAdmin = thMessages.admin as NestedMessages;
    const adminKeys = Object.keys(enAdmin);
    for (const key of adminKeys) {
      if (typeof enAdmin[key] === "string") {
        expect(thAdmin[key] as string).not.toBe(enAdmin[key] as string);
      }
    }
  });

  it("en locale has fork namespace keys", async () => {
    const en = (await loadMessages("en")) as NestedMessages;
    const fork = en.fork as NestedMessages;
    expect(fork).toBeDefined();
    expect(fork.step1Title as string).toBe("Fork the repository");
    expect(fork.submitTitle as string).toBe("Submit your Pull Request");
    expect(fork.trackPr as string).toBe("Track PR");
  });

  it("th locale has fork namespace keys", async () => {
    const th = (await loadMessages("th")) as NestedMessages;
    const fork = th.fork as NestedMessages;
    expect(fork).toBeDefined();
    expect(fork.step1Title as string).toContain("Fork");
    expect(fork.submitTitle as string).toContain("Pull Request");
    expect(fork.trackPr as string).toBe("ติดตาม PR");
  });

  it("en locale has review namespace keys", async () => {
    const en = (await loadMessages("en")) as NestedMessages;
    const review = en.review as NestedMessages;
    expect(review).toBeDefined();
    expect(review.history as string).toBe("Review History");
    expect(review.statusPending as string).toBe("Pending Review");
    expect(review.statusApproved as string).toBe("Approved");
  });

  it("th locale has review namespace keys", async () => {
    const th = (await loadMessages("th")) as NestedMessages;
    const review = th.review as NestedMessages;
    expect(review).toBeDefined();
    expect(review.history as string).toBe("ประวัติการตรวจสอบ");
    expect(review.statusPending as string).toBe("รอการตรวจสอบ");
  });

  it("en locale has workflow namespace keys", async () => {
    const en = (await loadMessages("en")) as NestedMessages;
    const workflow = en.workflow as NestedMessages;
    expect(workflow).toBeDefined();
    expect(workflow.allCompleted as string).toBe("All steps completed — great work!");
  });

  it("th locale has workflow namespace keys", async () => {
    const th = (await loadMessages("th")) as NestedMessages;
    const workflow = th.workflow as NestedMessages;
    expect(workflow).toBeDefined();
    expect(workflow.allCompleted as string).toBe("ทุกขั้นตอนเสร็จสมบูรณ์ — เยี่ยมมาก!");
  });

  it("en locale has lesson namespace keys", async () => {
    const en = (await loadMessages("en")) as NestedMessages;
    const lesson = en.lesson as NestedMessages;
    expect(lesson).toBeDefined();
    expect(lesson.noContent as string).toBe("No structured content available for this lesson yet.");
  });

  it("th locale has lesson namespace keys", async () => {
    const th = (await loadMessages("th")) as NestedMessages;
    const lesson = th.lesson as NestedMessages;
    expect(lesson).toBeDefined();
    expect(lesson.noContent as string).toBe("ยังไม่มีเนื้อหาสำหรับบทเรียนนี้");
  });

  it("en locale has updated module namespace keys", async () => {
    const en = (await loadMessages("en")) as NestedMessages;
    const mod = en.module as NestedMessages;
    expect(mod).toBeDefined();
    expect(mod.notFound as string).toBe("Module not found");
    expect(mod.lessonsCompleted as string).toBe("{completed} / {total} lessons completed");
  });

  it("th locale has updated module namespace keys", async () => {
    const th = (await loadMessages("th")) as NestedMessages;
    const mod = th.module as NestedMessages;
    expect(mod).toBeDefined();
    expect(mod.notFound as string).toBe("ไม่พบโมดูล");
    expect(mod.lessonsCompleted as string).toBe("{completed} / {total} บทเรียนที่เรียนแล้ว");
  });

  it("en locale has updated chat namespace keys", async () => {
    const en = (await loadMessages("en")) as NestedMessages;
    const chat = en.chat as NestedMessages;
    expect(chat).toBeDefined();
    expect(chat.title as string).toBe("AI Tutor");
    expect(chat.thinking as string).toBe("Thinking...");
  });

  it("th locale has updated chat namespace keys", async () => {
    const th = (await loadMessages("th")) as NestedMessages;
    const chat = th.chat as NestedMessages;
    expect(chat).toBeDefined();
    expect(chat.title as string).toBe("ติวเตอร์ AI");
    expect(chat.thinking as string).toBe("กำลังคิด...");
  });
});
