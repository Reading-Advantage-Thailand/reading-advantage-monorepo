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
});
