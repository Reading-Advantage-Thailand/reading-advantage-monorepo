import { describe, it, expect } from "vitest";
import { loadMessages } from "../i18n-messages";

describe("additional translation surfaces", () => {
  it("en locale has form validation keys", async () => {
    const en = await loadMessages("en");
    const form = en.admin?.form as Record<string, string>;
    expect(form).toBeDefined();
    expect(form.usernameRequired).toBe("Username is required");
    expect(form.passwordRequired).toBe("Password is required");
    expect(form.passwordMinLength).toBe("Password must be at least 8 characters");
  });

  it("th locale has form validation keys", async () => {
    const th = await loadMessages("th");
    const form = th.admin?.form as Record<string, string>;
    expect(form).toBeDefined();
    expect(form.usernameRequired).toBe("กรุณากรอกชื่อผู้ใช้");
    expect(form.passwordMinLength).toBe("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  });

  it("en locale has toast/success keys", async () => {
    const en = await loadMessages("en");
    const toast = en.admin?.toast as Record<string, string>;
    expect(toast).toBeDefined();
    expect(toast.createSuccess).toBe("Intern account created successfully!");
  });

  it("th locale has toast keys", async () => {
    const th = await loadMessages("th");
    const toast = th.admin?.toast as Record<string, string>;
    expect(toast).toBeDefined();
    expect(toast.createSuccess).toBe("สร้างบัญชีผู้ฝึกงานสำเร็จ!");
  });

  it("en locale has empty state keys", async () => {
    const en = await loadMessages("en");
    const empty = en.admin?.empty as Record<string, string>;
    expect(empty).toBeDefined();
    expect(empty.noInterns).toBe("No interns found");
    expect(empty.noQuizzes).toBe("No quiz submissions yet");
    expect(empty.noPrReviews).toBe("No PR reviews yet");
  });

  it("th locale has empty state keys", async () => {
    const th = await loadMessages("th");
    const empty = th.admin?.empty as Record<string, string>;
    expect(empty).toBeDefined();
    expect(empty.noInterns).toBe("ไม่พบผู้ฝึกงาน");
    expect(empty.noQuizzes).toBe("ยังไม่มีการส่งคำตอบแบบทดสอบ");
    expect(empty.noPrReviews).toBe("ยังไม่มีรีวิว PR");
  });

  it("en locale has locked module tooltip key", async () => {
    const en = await loadMessages("en");
    expect(en.module?.locked).toBe("Complete previous module");
  });

  it("th locale has locked module tooltip key", async () => {
    const th = await loadMessages("th");
    expect(th.module?.locked).toBe("ทำโมดูลก่อนหน้าให้เสร็จสิ้น");
  });
});
