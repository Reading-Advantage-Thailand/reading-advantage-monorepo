import { describe, it, expect } from "vitest";
import { loadMessages } from "../i18n-messages";
import type { NestedMessages } from "../i18n-messages";

describe("additional translation surfaces", () => {
  it("en locale has form validation keys", async () => {
    const en = (await loadMessages("en")) as NestedMessages;
    const admin = en.admin as NestedMessages;
    const form = admin.form as NestedMessages;
    expect(form).toBeDefined();
    expect(form.usernameRequired as string).toBe("Username is required");
    expect(form.passwordRequired as string).toBe("Password is required");
    expect(form.passwordMinLength as string).toBe("Password must be at least 8 characters");
    expect(form.usernameConflict as string).toBe("This username is already taken");
  });

  it("th locale has form validation keys", async () => {
    const th = (await loadMessages("th")) as NestedMessages;
    const admin = th.admin as NestedMessages;
    const form = admin.form as NestedMessages;
    expect(form).toBeDefined();
    expect(form.usernameRequired as string).toBe("กรุณากรอกชื่อผู้ใช้");
    expect(form.passwordMinLength as string).toBe("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    expect(form.usernameConflict as string).toBe("ชื่อผู้ใช้นี้มีอยู่แล้ว");
  });

  it("en locale has toast/success keys", async () => {
    const en = (await loadMessages("en")) as NestedMessages;
    const admin = en.admin as NestedMessages;
    const toast = admin.toast as NestedMessages;
    expect(toast).toBeDefined();
    expect(toast.createSuccess as string).toBe("Intern account created successfully!");
  });

  it("th locale has toast keys", async () => {
    const th = (await loadMessages("th")) as NestedMessages;
    const admin = th.admin as NestedMessages;
    const toast = admin.toast as NestedMessages;
    expect(toast).toBeDefined();
    expect(toast.createSuccess as string).toBe("สร้างบัญชีผู้ฝึกงานสำเร็จ!");
  });

  it("en locale has empty state keys", async () => {
    const en = (await loadMessages("en")) as NestedMessages;
    const admin = en.admin as NestedMessages;
    const empty = admin.empty as NestedMessages;
    expect(empty).toBeDefined();
    expect(empty.noInterns as string).toBe("No interns found");
    expect(empty.noQuizzes as string).toBe("No quiz submissions yet");
    expect(empty.noPrReviews as string).toBe("No PR reviews yet");
  });

  it("th locale has empty state keys", async () => {
    const th = (await loadMessages("th")) as NestedMessages;
    const admin = th.admin as NestedMessages;
    const empty = admin.empty as NestedMessages;
    expect(empty).toBeDefined();
    expect(empty.noInterns as string).toBe("ไม่พบผู้ฝึกงาน");
    expect(empty.noQuizzes as string).toBe("ยังไม่มีการส่งคำตอบแบบทดสอบ");
    expect(empty.noPrReviews as string).toBe("ยังไม่มีรีวิว PR");
  });

  it("en locale has locked module tooltip key", async () => {
    const en = (await loadMessages("en")) as NestedMessages;
    const module = en.module as NestedMessages;
    expect(module.locked as string).toBe("Complete previous module");
  });

  it("th locale has locked module tooltip key", async () => {
    const th = (await loadMessages("th")) as NestedMessages;
    const module = th.module as NestedMessages;
    expect(module.locked as string).toBe("ทำโมดูลก่อนหน้าให้เสร็จสิ้น");
  });
});
