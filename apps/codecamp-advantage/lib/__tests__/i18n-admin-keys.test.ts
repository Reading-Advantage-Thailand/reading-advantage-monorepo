import { describe, it, expect } from "vitest";
import { loadMessages } from "../i18n-messages";

describe("admin translation keys", () => {
  it("en locale has all admin keys", async () => {
    const messages = await loadMessages("en");
    expect(messages.admin).toBeDefined();
    expect(messages.admin.title).toBe("Intern Management");
    expect(messages.admin.interns).toBe("Interns");
    expect(messages.admin.addIntern).toBe("Add Intern");
    expect(messages.admin.overview).toBe("Overview");
    expect(messages.admin.progress).toBe("Progress");
    expect(messages.admin.prReviews).toBe("PR Reviews");
    expect(messages.admin.username).toBe("Username");
    expect(messages.admin.name).toBe("Name");
    expect(messages.admin.lastActive).toBe("Last Active");
    expect(messages.admin.noInterns).toBe("No interns yet");
    expect(messages.admin.createIntern).toBe("Create Intern Account");
    expect(messages.admin.backToOverview).toBe("Back to Overview");
  });

  it("th locale has all admin keys", async () => {
    const messages = await loadMessages("th");
    expect(messages.admin).toBeDefined();
    expect(messages.admin.title).toBe("จัดการผู้ฝึกงาน");
    expect(messages.admin.interns).toBe("ผู้ฝึกงาน");
    expect(messages.admin.addIntern).toBe("เพิ่มผู้ฝึกงาน");
    expect(messages.admin.overview).toBe("ภาพรวม");
    expect(messages.admin.progress).toBe("ความคืบหน้า");
    expect(messages.admin.prReviews).toBe("รีวิว PR");
    expect(messages.admin.username).toBe("ชื่อผู้ใช้");
    expect(messages.admin.name).toBe("ชื่อ");
    expect(messages.admin.lastActive).toBe("ใช้งานล่าสุด");
    expect(messages.admin.noInterns).toBe("ยังไม่มีผู้ฝึกงาน");
    expect(messages.admin.createIntern).toBe("สร้างบัญชีผู้ฝึกงาน");
    expect(messages.admin.backToOverview).toBe("กลับไปหน้าภาพรวม");
  });

  it("th admin keys differ from en (not duplicated English)", async () => {
    const enMessages = await loadMessages("en");
    const thMessages = await loadMessages("th");
    const adminKeys = Object.keys(enMessages.admin) as Array<keyof typeof enMessages.admin>;
    for (const key of adminKeys) {
      if (typeof enMessages.admin[key] === "string") {
        expect(thMessages.admin[key]).not.toBe(enMessages.admin[key]);
      }
    }
  });
});
