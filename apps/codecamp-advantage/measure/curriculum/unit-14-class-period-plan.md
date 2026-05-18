# Unit 14 Class Period Plans: Internationalization

---

## Period 1: Setting Up next-intl

**Duration:** ~60 minutes

### Opening (5 min)

- codecamp interns are Thai speakers — the UI should support Thai
- next-intl 4.11.0 is the i18n library used by Reading Advantage
- Today: set up the infrastructure

### Activity: Install next-intl (10 min)

```bash
pnpm add next-intl@4.11.0
```

### Activity: Configure Locale Routing (20 min)

```typescript
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "th"],
  defaultLocale: "en",
});
```

```typescript
// src/i18n/navigation.ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

```typescript
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming locale is valid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

### Activity: Create Message Files (20 min)

```json
// messages/en.json
{
  "dashboard": {
    "title": "Learning Dashboard",
    "subtitle": "Track your progress across all modules",
    "overallProgress": "Overall Progress",
    "lessonsCompleted": "Lessons Completed",
    "totalLessons": "Total Lessons"
  },
  "module": {
    "start": "Start Module",
    "continue": "Continue",
    "completed": "Completed",
    "progress": "{completed} of {total} lessons"
  },
  "lesson": {
    "theory": "Theory",
    "exercise": "Exercise",
    "quiz": "Quiz",
    "start": "Start",
    "review": "Review"
  },
  "auth": {
    "login": "Log In",
    "logout": "Log Out",
    "email": "Email",
    "password": "Password",
    "loginButton": "Sign In"
  }
}
```

```json
// messages/th.json
{
  "dashboard": {
    "title": "แดชบอร์ดการเรียนรู้",
    "subtitle": "ติดตามความคืบหน้าของคุณในทุกโมดูล",
    "overallProgress": "ความคืบหน้าโดยรวม",
    "lessonsCompleted": "บทเรียนที่เสร็จแล้ว",
    "totalLessons": "บทเรียนทั้งหมด"
  },
  "module": {
    "start": "เริ่มโมดูล",
    "continue": "ดำเนินการต่อ",
    "completed": "เสร็จสิ้น",
    "progress": "{completed} จาก {total} บทเรียน"
  },
  "lesson": {
    "theory": "ทฤษฎี",
    "exercise": "แบบฝึกหัด",
    "quiz": "แบบทดสอบ",
    "start": "เริ่ม",
    "review": "ทบทวน"
  },
  "auth": {
    "login": "เข้าสู่ระบบ",
    "logout": "ออกจากระบบ",
    "email": "อีเมล",
    "password": "รหัสผ่าน",
    "loginButton": "เข้าสู่ระบบ"
  }
}
```

### Activity: Update Next.js Config (5 min)

```typescript
// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  // ... existing config
};

export default withNextIntl(nextConfig);
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: set up next-intl with Thai and English locales"
git push
```

### Closing

- next-intl setup, locale routing, message files ✓
- Preview: Period 2 covers using translations in components

---

## Period 2: Using Translations in Components

**Duration:** ~60 minutes

### Opening (5 min)

- Message files define the strings — components use them
- Server Components and Client Components use different hooks
- Today: replace all hardcoded strings with translations

### Activity: Server Component Translations (15 min)

```tsx
// src/app/[locale]/page.tsx
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("dashboard");

  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
    </div>
  );
}
```

### Activity: Client Component Translations (20 min)

```tsx
// src/components/ModuleCard.tsx
"use client";

import { useTranslations } from "next-intl";

export function ModuleCard({ module }: { module: Module }) {
  const t = useTranslations("module");

  return (
    <div className="rounded-lg border p-6">
      <h3>{module.title}</h3>
      <p>{module.description}</p>
      <div className="mt-4">
        <div className="h-2 rounded-full bg-gray-200">
          <div className="h-full bg-blue-500" style={{ width: `${module.progress}%` }} />
        </div>
        <p className="text-xs text-gray-400">
          {t("progress", { completed: module.completedLessons, total: module.lessonCount })}
        </p>
      </div>
      <button className="mt-3">
        {module.progress > 0 ? t("continue") : t("start")}
      </button>
    </div>
  );
}
```

**Key:** ICU message format for interpolation:
- `{variable}` — simple interpolation
- `{count, plural, one {item} other {items}}` — pluralization
- `{gender, select, male {he} female {she} other {they}}` — selection

### Activity: Locale Switcher Component (15 min)

```tsx
// src/components/LocaleSwitcher.tsx
"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex gap-2">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`rounded px-2 py-1 text-sm ${
            locale === loc ? "bg-blue-500 text-white" : "bg-gray-100"
          }`}
        >
          {loc === "en" ? "EN" : "ไทย"}
        </button>
      ))}
    </div>
  );
}
```

### Activity: Commit (5 min)

```bash
git add -A && git commit -m "feat: replace hardcoded strings with next-intl translations"
git push
```

### Closing

- Server and Client component translations, locale switcher ✓
- Preview: Period 3 wraps up with exercise and quiz

---

## Period 3: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- i18n unit nearly complete
- Today: exercise and quiz

### Activity: Exercise — Add i18n to the Blog App (40 min)

**Exercise repo:** `codecamp-exercise-internationalization`

The intern forks the exercise repo which contains:
- A Next.js 16.0.0 blog app with hardcoded English strings
- A README with requirements

Requirements:
1. Install next-intl 4.11.0 and configure routing for `en` and `th`
2. Create `messages/en.json` and `messages/th.json` with all UI strings
3. Replace all hardcoded strings in Server Components with `getTranslations()`
4. Replace all hardcoded strings in Client Components with `useTranslations()`
5. Add a `LocaleSwitcher` component in the header
6. Handle pluralization for comment count ("1 comment" vs "2 comments" / "1 ความคิดเห็น" vs "2 ความคิดเห็น")
7. Use the `Link` component from `next-intl/navigation` (not Next.js `Link`) for all internal navigation
8. Curriculum content (post body text) stays in English — only UI chrome is translated

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. What hook do you use in a Server Component? (`getTranslations()` — it's async)
2. What hook do you use in a Client Component? (`useTranslations()` — it's a React hook)
3. How do you interpolate a variable in a message? (`{variableName}` in the message, pass as second arg to `t()`)
4. Why use `next-intl/navigation`'s `Link` instead of Next.js `Link`? (it automatically includes the locale prefix in the URL)
5. Should curriculum content be translated? (No — only UI chrome. Content stays in its original language.)

### Closing

- i18n unit complete — Student Progress Tracker supports Thai and English
- Next unit: AI Integration
