/** English copy for the Codecamp Advantage product page. */
export const en = {
  hero: {
    badge: "Live learning platform",
    eyebrow: "Full-stack development internship",
    title: "Build software. Prove mastery.",
    subtitle: "A production pathway from first commit to deployed application.",
    description:
      "Codecamp Advantage combines explicit instruction, real development work, targeted AI support, and durable evidence of what each learner can do.",
    primaryCta: "Open Codecamp Advantage",
    secondaryCta: "Explore the curriculum",
    previewLabel: "Production dashboard",
    status: "Live",
    dashboardAlt: "Codecamp Advantage production curriculum dashboard",
    stats: {
      phases: { value: "4", label: "Curriculum phases" },
      modules: { value: "20", label: "Learning modules" },
      lessons: { value: "106", label: "Guided lessons" },
    },
  },
  mastery: {
    eyebrow: "Mastery Advantage — complete vertical slice",
    heading:
      "The first Advantage app to implement Mastery Advantage end to end.",
    description:
      "Codecamp Advantage turns learning activity into an auditable mastery loop. Objectives, evidence, support usage, confidence, and review history stay connected instead of disappearing into a completion percentage.",
    steps: {
      objectives: {
        title: "Versioned objectives",
        description:
          "Every lesson maps to a defined objective and curriculum version.",
      },
      evidence: {
        title: "Verified evidence",
        description:
          "Activities record what the learner produced and which variant they completed.",
      },
      confidence: {
        title: "Scaffold-aware confidence",
        description:
          "Mastery signals account for hints and support instead of treating all completions as equal.",
      },
      review: {
        title: "SRS follow-up",
        description:
          "Review scheduling and the instructor ledger keep mastery visible over time.",
      },
    },
  },
  curriculum: {
    eyebrow: "Production curriculum",
    heading: "20 modules. One coherent engineering journey.",
    description:
      "The pathway moves from development foundations through modern full-stack delivery, then applies the same disciplined workflow to AI development and game creation.",
    cohortNote:
      "Newly assigned cohorts receive this 20-module pathway. Existing cohorts keep their assigned sequence so their progress is never silently rewritten.",
    moduleLabel: "modules",
    phases: {
      A: {
        name: "Phase A",
        title: "Foundations",
        description:
          "Set up professional habits and learn the language of the web.",
        modules: [
          "Development environment",
          "Git and GitHub",
          "HTML and CSS",
          "JavaScript fundamentals",
          "TypeScript",
          "Testing with Vitest",
        ],
      },
      B: {
        name: "Phase B",
        title: "Frontend and APIs",
        description:
          "Build responsive interfaces and connect them to application data.",
        modules: [
          "React",
          "API fundamentals",
          "Next.js foundations",
          "Advanced Next.js",
        ],
      },
      C: {
        name: "Phase C",
        title: "Backend and data",
        description: "Design persistent, secure, typed application behavior.",
        modules: [
          "Databases and ORMs",
          "tRPC and server actions",
          "Authentication",
        ],
      },
      D: {
        name: "Phase D",
        title: "Production practice",
        description:
          "Ship, measure, and extend real systems with accountable AI workflows.",
        modules: [
          "Internationalization",
          "AI integration",
          "Monorepos and packages",
          "Cloud and Docker",
          "Measure-Driven AI Development",
          "Real-world practice",
          "Advantage Play Kit Game Creation",
        ],
      },
    },
    spotlights: {
      measure: {
        label: "Module 16",
        title: "Measure-Driven AI Development",
        description:
          "Learners move from a written specification to an implementation plan, atomic delivery, verification evidence, and honest closeout.",
        alt: "Measure lesson inside the live Codecamp Advantage application",
      },
      apk: {
        label: "Unit 20",
        title: "Advantage Play Kit Game Creation",
        description:
          "The final unit applies the workflow to a complete browser game: define the learning contract, build the experience, test it, and package evidence for review.",
        outcome: "SPEC → PLAN → BUILD → VERIFY → SHIP",
      },
    },
  },
  toolchain: {
    eyebrow: "Production toolchain",
    heading: "Learn the system we actually ship.",
    description:
      "One modern, typed stack carries learners from interface work to data, deployment, and measured delivery.",
    items: [
      "Next.js",
      "React",
      "TypeScript",
      "PostgreSQL + Drizzle",
      "GitHub",
      "Docker",
      "Google Cloud Run",
      "Measure",
    ],
  },
  pedagogy: {
    heading: "I Do → We Do → You Do",
    description:
      "Instruction deliberately reduces support as learners move from worked examples to guided practice and independent production work.",
    steps: {
      iDo: {
        title: "I Do",
        description:
          "A focused lesson models the concept and makes expert decisions visible.",
      },
      weDo: {
        title: "We Do",
        description:
          "Guided practice checks understanding while support is still available.",
      },
      youDo: {
        title: "You Do",
        description:
          "Independent work produces the evidence used by the mastery system and instructor.",
      },
    },
  },
  evidence: {
    tutor: {
      label: "Targeted support",
      title: "An activity-bound AI tutor",
      description:
        "The tutor works from trusted lesson resources and the learner's current activity. Its purpose is timely scaffolding—not unlimited answer generation or an unverified service-level promise.",
    },
    prReview: {
      label: "Controlled rollout",
      title: "Advisory pull-request review",
      description:
        "AI review can surface evidence and corrections for instructors while the evaluator runs in shadow mode.",
      guardrail:
        "The advisory reviewer does not approve, block, pass, fail, or mutate learner mastery. Human review remains authoritative.",
    },
    signals: {
      ledger: {
        title: "Instructor evidence ledger",
        description:
          "Review objective history, confidence, and supporting activity evidence.",
      },
      scaffolds: {
        title: "Scaffold usage",
        description:
          "See when hints or tutor support contributed to a successful attempt.",
      },
      followUp: {
        title: "Scheduled follow-up",
        description:
          "Use spaced review to check whether demonstrated mastery persists.",
      },
    },
  },
  cta: {
    eyebrow: "The platform is live",
    heading: "See the first complete Mastery Advantage implementation.",
    description:
      "Open Codecamp Advantage and explore the full-stack curriculum now running in production.",
    button: "Visit Codecamp Advantage",
  },
};

/** Thai copy for the Codecamp Advantage product page. */
export const th = {
  hero: {
    badge: "แพลตฟอร์มการเรียนรู้พร้อมใช้งาน",
    eyebrow: "การฝึกงานพัฒนาฟูลสแตก",
    title: "สร้างซอฟต์แวร์ พิสูจน์ความเชี่ยวชาญ",
    subtitle: "เส้นทางจริงตั้งแต่คอมมิตแรกจนถึงแอปที่นำขึ้นใช้งาน",
    description:
      "Codecamp Advantage ผสานการสอนอย่างชัดเจน งานพัฒนาจริง การช่วยเหลือด้วย AI แบบตรงจุด และหลักฐานที่ตรวจสอบได้ว่าผู้เรียนทำอะไรได้",
    primaryCta: "เปิด Codecamp Advantage",
    secondaryCta: "ดูหลักสูตร",
    previewLabel: "แดชบอร์ดระบบจริง",
    status: "พร้อมใช้งาน",
    dashboardAlt: "แดชบอร์ดหลักสูตรจริงของ Codecamp Advantage",
    stats: {
      phases: { value: "4", label: "เฟสหลักสูตร" },
      modules: { value: "20", label: "โมดูลการเรียน" },
      lessons: { value: "106", label: "บทเรียนแบบมีแนวทาง" },
    },
  },
  mastery: {
    eyebrow: "Mastery Advantage — ระบบครบวงจร",
    heading: "แอป Advantage แรกที่ใช้ Mastery Advantage ครบตั้งแต่ต้นจนจบ",
    description:
      "Codecamp Advantage เปลี่ยนกิจกรรมการเรียนให้เป็นวงจรความเชี่ยวชาญที่ตรวจสอบได้ โดยเชื่อมวัตถุประสงค์ หลักฐาน การใช้ตัวช่วย ความมั่นใจ และประวัติการทบทวนไว้ด้วยกัน",
    steps: {
      objectives: {
        title: "วัตถุประสงค์มีเวอร์ชัน",
        description:
          "ทุกบทเรียนเชื่อมกับวัตถุประสงค์และเวอร์ชันหลักสูตรที่ชัดเจน",
      },
      evidence: {
        title: "หลักฐานที่ตรวจสอบได้",
        description: "กิจกรรมบันทึกผลงานและรูปแบบโจทย์ที่ผู้เรียนทำสำเร็จ",
      },
      confidence: {
        title: "ความมั่นใจที่คำนึงถึงตัวช่วย",
        description:
          "สัญญาณความเชี่ยวชาญคำนึงถึงคำใบ้และการช่วยเหลือ ไม่ถือว่าทุกการทำเสร็จเท่ากัน",
      },
      review: {
        title: "ทบทวนด้วย SRS",
        description:
          "กำหนดการทบทวนและบัญชีหลักฐานสำหรับผู้สอนทำให้เห็นความเชี่ยวชาญต่อเนื่อง",
      },
    },
  },
  curriculum: {
    eyebrow: "หลักสูตรที่ใช้งานจริง",
    heading: "20 โมดูล หนึ่งเส้นทางวิศวกรรมที่ต่อเนื่อง",
    description:
      "เส้นทางเริ่มจากพื้นฐานการพัฒนา ไปสู่การส่งมอบฟูลสแตกสมัยใหม่ แล้วใช้เวิร์กโฟลว์เดียวกันกับการพัฒนา AI และการสร้างเกม",
    cohortNote:
      "ผู้เรียนกลุ่มที่ได้รับมอบหมายใหม่จะใช้เส้นทาง 20 โมดูลนี้ ส่วนกลุ่มเดิมจะคงลำดับที่ได้รับมอบหมายไว้ เพื่อไม่ให้ความคืบหน้าถูกเขียนทับโดยไม่แจ้ง",
    moduleLabel: "โมดูล",
    phases: {
      A: {
        name: "เฟส A",
        title: "พื้นฐาน",
        description: "สร้างนิสัยการทำงานแบบมืออาชีพและเรียนรู้ภาษาของเว็บ",
        modules: [
          "สภาพแวดล้อมการพัฒนา",
          "Git และ GitHub",
          "HTML และ CSS",
          "พื้นฐาน JavaScript",
          "TypeScript",
          "การทดสอบด้วย Vitest",
        ],
      },
      B: {
        name: "เฟส B",
        title: "ฟรอนต์เอนด์และ API",
        description: "สร้างอินเทอร์เฟซที่ตอบสนองและเชื่อมต่อข้อมูลแอป",
        modules: ["React", "พื้นฐาน API", "พื้นฐาน Next.js", "Next.js ขั้นสูง"],
      },
      C: {
        name: "เฟส C",
        title: "แบ็กเอนด์และข้อมูล",
        description: "ออกแบบพฤติกรรมแอปที่ถาวร ปลอดภัย และมีชนิดข้อมูล",
        modules: [
          "ฐานข้อมูลและ ORM",
          "tRPC และ server actions",
          "การยืนยันตัวตน",
        ],
      },
      D: {
        name: "เฟส D",
        title: "การทำงานระดับโปรดักชัน",
        description:
          "ส่งมอบ วัดผล และต่อยอดระบบจริงด้วยเวิร์กโฟลว์ AI ที่รับผิดชอบ",
        modules: [
          "การรองรับหลายภาษา",
          "การผสาน AI",
          "Monorepo และแพ็กเกจ",
          "คลาวด์และ Docker",
          "การพัฒนา AI ด้วย Measure",
          "การฝึกจากงานจริง",
          "การสร้างเกมด้วย Advantage Play Kit",
        ],
      },
    },
    spotlights: {
      measure: {
        label: "โมดูล 16",
        title: "การพัฒนา AI ด้วย Measure",
        description:
          "ผู้เรียนเริ่มจากสเปก เขียนแผน ส่งมอบเป็นส่วนย่อย ตรวจสอบหลักฐาน และปิดงานอย่างตรงไปตรงมา",
        alt: "บทเรียน Measure ในแอป Codecamp Advantage ที่ใช้งานจริง",
      },
      apk: {
        label: "หน่วย 20",
        title: "การสร้างเกมด้วย Advantage Play Kit",
        description:
          "หน่วยสุดท้ายใช้เวิร์กโฟลว์กับเกมเบราว์เซอร์ที่สมบูรณ์ ตั้งแต่สัญญาการเรียนรู้ การสร้าง การทดสอบ จนถึงหลักฐานสำหรับการทบทวน",
        outcome: "สเปก → แผน → สร้าง → ตรวจสอบ → ส่งมอบ",
      },
    },
  },
  toolchain: {
    eyebrow: "เครื่องมือระดับโปรดักชัน",
    heading: "เรียนรู้ระบบเดียวกับที่เราส่งมอบจริง",
    description:
      "สแตกสมัยใหม่ที่มีชนิดข้อมูลชัดเจนพาผู้เรียนจากอินเทอร์เฟซไปสู่ข้อมูล การดีพลอย และการส่งมอบที่วัดผลได้",
    items: [
      "Next.js",
      "React",
      "TypeScript",
      "PostgreSQL + Drizzle",
      "GitHub",
      "Docker",
      "Google Cloud Run",
      "Measure",
    ],
  },
  pedagogy: {
    heading: "ฉันทำ → เราทำ → คุณทำ",
    description:
      "การสอนค่อย ๆ ลดตัวช่วยเมื่อผู้เรียนเปลี่ยนจากตัวอย่าง ไปสู่การฝึกแบบมีแนวทางและงานจริงด้วยตนเอง",
    steps: {
      iDo: {
        title: "ฉันทำ",
        description:
          "บทเรียนเฉพาะจุดสาธิตแนวคิดและทำให้การตัดสินใจของผู้เชี่ยวชาญมองเห็นได้",
      },
      weDo: {
        title: "เราทำ",
        description: "การฝึกแบบมีแนวทางตรวจความเข้าใจขณะที่ยังมีตัวช่วย",
      },
      youDo: {
        title: "คุณทำ",
        description: "งานอิสระสร้างหลักฐานที่ระบบความเชี่ยวชาญและผู้สอนใช้",
      },
    },
  },
  evidence: {
    tutor: {
      label: "ความช่วยเหลือตรงจุด",
      title: "AI ติวเตอร์ที่ผูกกับกิจกรรม",
      description:
        "ติวเตอร์ทำงานจากแหล่งข้อมูลบทเรียนที่เชื่อถือได้และกิจกรรมปัจจุบัน เพื่อช่วยในเวลาที่เหมาะสม ไม่ใช่สร้างคำตอบไม่จำกัดหรืออ้าง SLA ที่ยังไม่ยืนยัน",
    },
    prReview: {
      label: "เปิดใช้งานแบบควบคุม",
      title: "การรีวิว pull request แบบให้คำแนะนำ",
      description:
        "AI ช่วยชี้หลักฐานและจุดแก้ไขให้ผู้สอน ขณะที่ตัวประเมินทำงานในโหมดเงา",
      guardrail:
        "ผู้รีวิวแบบให้คำแนะนำจะไม่อนุมัติ บล็อก ตัดสินผ่านหรือไม่ผ่าน หรือแก้ค่าความเชี่ยวชาญของผู้เรียน การทบทวนโดยมนุษย์ยังเป็นข้อยุติ",
    },
    signals: {
      ledger: {
        title: "บัญชีหลักฐานผู้สอน",
        description: "ดูประวัติวัตถุประสงค์ ความมั่นใจ และหลักฐานกิจกรรม",
      },
      scaffolds: {
        title: "การใช้ตัวช่วย",
        description: "ดูว่าคำใบ้หรือติวเตอร์ช่วยให้การทำครั้งนั้นสำเร็จเมื่อใด",
      },
      followUp: {
        title: "การทบทวนตามกำหนด",
        description: "ใช้การทบทวนแบบเว้นระยะเพื่อตรวจว่าความเชี่ยวชาญยังคงอยู่",
      },
    },
  },
  cta: {
    eyebrow: "แพลตฟอร์มพร้อมใช้งาน",
    heading: "ดูการใช้ Mastery Advantage แบบครบวงจรครั้งแรก",
    description:
      "เปิด Codecamp Advantage และสำรวจหลักสูตรฟูลสแตกที่กำลังทำงานในระบบจริง",
    button: "ไปที่ Codecamp Advantage",
  },
};

/** Simplified Chinese copy for the Codecamp Advantage product page. */
export const zh = {
  hero: {
    badge: "学习平台已上线",
    eyebrow: "全栈开发实习课程",
    title: "构建软件，证明掌握",
    subtitle: "从第一次提交到应用上线的完整实战路径",
    description:
      "Codecamp Advantage 将明确教学、真实开发、针对性 AI 支持与可持续核验的能力证据结合在一起。",
    primaryCta: "打开 Codecamp Advantage",
    secondaryCta: "查看课程",
    previewLabel: "生产环境仪表板",
    status: "已上线",
    dashboardAlt: "Codecamp Advantage 生产课程仪表板",
    stats: {
      phases: { value: "4", label: "课程阶段" },
      modules: { value: "20", label: "学习模块" },
      lessons: { value: "106", label: "引导式课程" },
    },
  },
  mastery: {
    eyebrow: "Mastery Advantage — 完整闭环",
    heading: "首个端到端完整实施 Mastery Advantage 的 Advantage 应用",
    description:
      "Codecamp Advantage 将学习活动转化为可审计的掌握闭环，把目标、证据、支架使用、信心水平和复习历史持续连接。",
    steps: {
      objectives: {
        title: "版本化目标",
        description: "每节课都映射到明确的学习目标和课程版本。",
      },
      evidence: {
        title: "可验证证据",
        description: "活动记录学习者的产出以及完成的题目变体。",
      },
      confidence: {
        title: "考虑支架的信心",
        description: "掌握信号会计入提示和支持，不把所有完成情况视为相同。",
      },
      review: {
        title: "SRS 后续复习",
        description: "复习安排和教师证据账本让掌握情况随时间保持可见。",
      },
    },
  },
  curriculum: {
    eyebrow: "生产课程",
    heading: "20 个模块，一条连贯的工程成长路径",
    description:
      "课程从开发基础进入现代全栈交付，再将同一套严谨流程应用于 AI 开发和游戏创作。",
    cohortNote:
      "新分配的学习群体使用这条 20 模块路径；现有群体保留原有分配顺序，学习进度不会被静默改写。",
    moduleLabel: "个模块",
    phases: {
      A: {
        name: "阶段 A",
        title: "基础",
        description: "建立专业习惯，掌握 Web 开发语言。",
        modules: [
          "开发环境",
          "Git 与 GitHub",
          "HTML 与 CSS",
          "JavaScript 基础",
          "TypeScript",
          "使用 Vitest 测试",
        ],
      },
      B: {
        name: "阶段 B",
        title: "前端与 API",
        description: "构建响应式界面并连接应用数据。",
        modules: ["React", "API 基础", "Next.js 基础", "高级 Next.js"],
      },
      C: {
        name: "阶段 C",
        title: "后端与数据",
        description: "设计持久、安全、类型明确的应用行为。",
        modules: ["数据库与 ORM", "tRPC 与 server actions", "身份验证"],
      },
      D: {
        name: "阶段 D",
        title: "生产实践",
        description: "用负责任的 AI 工作流交付、衡量并扩展真实系统。",
        modules: [
          "国际化",
          "AI 集成",
          "Monorepo 与包管理",
          "云与 Docker",
          "Measure 驱动的 AI 开发",
          "真实项目实践",
          "Advantage Play Kit 游戏创作",
        ],
      },
    },
    spotlights: {
      measure: {
        label: "模块 16",
        title: "Measure 驱动的 AI 开发",
        description:
          "学习者从书面规格开始，制定计划、原子化交付、验证证据并如实收尾。",
        alt: "Codecamp Advantage 生产应用中的 Measure 课程",
      },
      apk: {
        label: "单元 20",
        title: "Advantage Play Kit 游戏创作",
        description:
          "最终单元把这套流程用于完整的浏览器游戏：定义学习契约、构建体验、测试并整理评审证据。",
        outcome: "规格 → 计划 → 构建 → 验证 → 发布",
      },
    },
  },
  toolchain: {
    eyebrow: "生产工具链",
    heading: "学习我们真正交付的系统",
    description: "同一套现代类型化技术栈，覆盖界面、数据、部署与可衡量交付。",
    items: [
      "Next.js",
      "React",
      "TypeScript",
      "PostgreSQL + Drizzle",
      "GitHub",
      "Docker",
      "Google Cloud Run",
      "Measure",
    ],
  },
  pedagogy: {
    heading: "我示范 → 我们练 → 你独立完成",
    description:
      "教学支持会逐步减少，让学习者从示例走向引导练习，最终完成独立生产任务。",
    steps: {
      iDo: {
        title: "我示范",
        description: "聚焦课程演示概念，并让专家决策过程清晰可见。",
      },
      weDo: {
        title: "我们练",
        description: "在仍有支持时，通过引导练习检查理解。",
      },
      youDo: {
        title: "你独立完成",
        description: "独立任务产出供掌握系统与教师使用的证据。",
      },
    },
  },
  evidence: {
    tutor: {
      label: "针对性支持",
      title: "与活动绑定的 AI 导师",
      description:
        "导师基于可信课程资源和学习者当前活动提供及时支架，而不是无限生成答案或承诺未经验证的服务等级。",
    },
    prReview: {
      label: "受控上线",
      title: "建议式拉取请求审查",
      description: "当评估器运行在影子模式时，AI 可为教师提示证据和修正点。",
      guardrail:
        "建议式审查不会批准、阻止、判定通过或失败，也不会修改学习者掌握状态；人工审查仍具有最终权威。",
    },
    signals: {
      ledger: {
        title: "教师证据账本",
        description: "查看目标历史、信心水平和支持性活动证据。",
      },
      scaffolds: {
        title: "支架使用情况",
        description: "查看提示或导师支持何时促成成功尝试。",
      },
      followUp: {
        title: "计划复习",
        description: "通过间隔复习检查已证明的掌握是否持续。",
      },
    },
  },
  cta: {
    eyebrow: "平台已上线",
    heading: "查看首个完整 Mastery Advantage 实施",
    description: "打开 Codecamp Advantage，探索正在生产环境运行的全栈课程。",
    button: "访问 Codecamp Advantage",
  },
};
