export const en = {
    hero: {
        eyebrow: "Mastery Advantage",
        title: "Always know what's next.",
        description:
            "The adaptive engine behind our curriculum — combining Knowledge Space Theory with FSRS spaced repetition to place, teach, and track each student.",
    },
    altTexts: {
        adaptivePath: "Adaptive learning path visualization",
        spacedRepetition: "Spaced repetition visualization",
        progressTracking: "Progress tracking visualization",
    },
    video: {
        play: "Play background video",
        pause: "Pause background video",
    },
    states: {
        mastered: "Mastered",
        here: "You are here",
        ready: "Ready",
        locked: "Locked",
    },
    panels: {
        path: {
            label: "Skill graph",
            caption: "Mastered skills open the skills that depend on them. Locked skills wait for their prerequisites.",
        },
        review: {
            label: "Review timing",
            caption: "Each review is scheduled for the individual student, before the memory fades.",
            axisMemory: "Memory",
            axisTime: "Time",
            reviewDue: "Review due",
        },
        progress: {
            label: "Skill progress",
            caption: "One view shows what each student has mastered, what is ready, and what is still locked.",
            example: "Illustrative example, not real student data.",
            skills: {
                a: "Skill A",
                b: "Skill B",
                c: "Skill C",
                d: "Skill D",
            },
        },
    },
    tagged: {
        eyebrow: "Tagged content",
        title: "How a lesson is tagged.",
        description:
            "Every printed workbook has 14 lessons. We tag each lesson to skills in the Mastery Advantage knowledge graph. The same tags connect the workbook to its digital twin.",
        steps: {
            lesson: {
                title: "A workbook lesson",
                description: "The lesson stays a printed, teacher-led lesson with its own activities and reading.",
            },
            tag: {
                title: "Tagged to skills",
                description: "Each lesson links to the skills it teaches and practices. Skills align to CEFR levels.",
            },
            graph: {
                title: "Placed in the graph",
                description: "The graph orders skills by prerequisite, so the engine knows which skills are ready next.",
            },
        },
    },
    adaptivePath: {
        eyebrow: "Adaptive learning paths",
        title: "One path for every student.",
        description:
            "Every student follows a unique path through the skill graph. The system surfaces the next ready-to-learn skill based on what they've already mastered — no gaps, no redundancy.",
    },
    spacedRepetition: {
        eyebrow: "Spaced repetition",
        title: "Review at the right moment.",
        description:
            "FSRS calibrates each review interval to the individual. Items resurface at the moment before forgetting — so retention compounds and nothing is lost.",
    },
    explorer: {
        eyebrow: "Explore the graph",
        title: "Step through one student's path.",
        description:
            "Pick a subject, then play the example or step through it. See a skill about to fade, the review that saves it, and the new skills it opens.",
        labels: {
            idle: "Mastery Advantage ®",
            forgetting: "About to forget — reviewing before it fades",
            reviewing: "Reviewing…",
            reviewed: "Reviewed! Memory secured.",
            reviewedTag: "Reviewed! ✓",
            ready: "Ready to learn — prerequisites mastered",
            readyTag: "Ready to learn!",
            learning: "Learning…",
            unlocked: "Skill unlocked! Recalculating the path…",
            expandedOne: "{n} new skill unlocked — the path just expanded",
            expandedMany: "{n} new skills unlocked — the path just expanded",
            pathUpdated: "The path has been updated",
            svgLabel: "Mastery Advantage knowledge graph",
            example: "Illustrative example, not real student data.",
            planned: "Planned, no date",
            tabsLabel: "Choose a subject",
            controlsLabel: "Graph controls",
            play: "Play",
            pause: "Pause",
            previous: "Previous step",
            next: "Next step",
            stepOf: "Step {current} of {total}",
            whatsNext: "What is next",
            nextTitle: "What is next for this student",
            nextHere: "You are here: {cluster}",
            nextReady: "{cluster}: {n} ready",
            nextNone: "No skills are ready yet.",
            states: {
                mastered: "Mastered",
                here: "You are here",
                ready: "Ready",
                locked: "Locked",
            },
        },
    },
    progress: {
        eyebrow: "Progress tracking",
        title: "Every skill, tracked and visible.",
        description:
            "Teachers and admins see exactly which skills each student has mastered, which they're working on, and which ones they're not ready for yet. No guesswork.",
    },
    technicalOverview: {
        eyebrow: "How it works",
        title: "The technology behind the engine.",
        description:
            "Mastery Advantage combines two research-backed systems into a single adaptive engine that places students, schedules reviews, and tracks proficiency across our products.",
        pillars: {
            kst: {
                title: "Knowledge Space Theory",
                description: "Skills are organized into a directed acyclic graph of prerequisites. A student can only learn a skill after mastering all its prerequisites. The system uses this graph to determine readiness and generate personalized learning paths.",
            },
            fsrs: {
                title: "FSRS Scheduling",
                description: "The Free Spaced Repetition Scheduler models each student's memory for every skill. After each interaction, it updates the predicted retention and schedules the next review at the right interval — balancing efficiency and retention.",
            },
            edgeCalibration: {
                title: "Edge Calibration",
                description: "The system identifies the boundary between known and unknown skills through targeted assessment. Rather than testing everything, it focuses on the edges of the student's knowledge space to place them efficiently.",
            },
            placement: {
                title: "Adaptive Placement",
                description: "New students are placed at their true level through edge-calibrated assessment. The system quickly identifies which skills they've mastered and which they haven't, generating a personalized starting point without a lengthy placement test.",
            },
            proficiency: {
                title: "Proficiency Assessment",
                description: "Proficiency is measured continuously through student interactions. Each response updates the system's estimate of skill mastery, providing real-time visibility into student progress.",
            },
        },
    },
    powersEveryProduct: {
        eyebrow: "Where it runs",
        title: "Live in CodeCamp Advantage. Entering Primary Advantage.",
        description:
            "Mastery Advantage runs in production for CodeCamp Advantage. It is entering Primary Advantage through tagged content. Our live product lines are Primary Advantage, Reading Advantage, and CodeCamp Advantage.",
        cards: {
            codecamp: {
                status: "Live",
                logoAlt: "CodeCamp Advantage logo",
                description: "Mastery Advantage runs in production for CodeCamp Advantage.",
            },
            primary: {
                status: "Entering",
                logoAlt: "Primary Advantage logo",
                description: "Entering through tagged content. Shadow mode runs in semester 2 2026. Adaptive features are targeted for May 2027.",
            },
            reading: {
                status: "Not yet",
                logoAlt: "Reading Advantage logo",
                description: "Not in Reading Advantage today. It follows after Primary Advantage, with no date.",
            },
        },
    },
    cta: {
        eyebrow: "See it in action",
        title: "Twenty minutes. Your students' data, on your screen.",
        description:
            "We'll walk through how the engine works across your subjects of interest and show you exactly what the dashboards surface.",
        button: "Book a 20-min demo",
    },
};

export const th = {
    hero: {
        eyebrow: "Mastery Advantage",
        title: "รู้ว่าต้องเรียนอะไรถัดไปเสมอ",
        description:
            "เครื่องยนต์ปรับตัวเบื้องหลังหลักสูตรของเรา — ผสมผสาน Knowledge Space Theory กับการทบทวนแบบเว้นช่วง FSRS เพื่อจัดตำแหน่ง สอน และติดตามนักเรียนแต่ละคน",
    },
    altTexts: {
        adaptivePath: "ภาพจำลองเส้นทางการเรียนรู้แบบปรับตัว",
        spacedRepetition: "ภาพจำลองการทบทวนแบบเว้นช่วง",
        progressTracking: "ภาพจำลองการติดตามความก้าวหน้า",
    },
    video: {
        play: "เล่นวิดีโอพื้นหลัง",
        pause: "หยุดวิดีโอพื้นหลัง",
    },
    states: {
        mastered: "เชี่ยวชาญแล้ว",
        here: "คุณอยู่ที่นี่",
        ready: "พร้อมเรียน",
        locked: "ล็อกอยู่",
    },
    panels: {
        path: {
            label: "กราฟทักษะ",
            caption: "ทักษะที่เชี่ยวชาญแล้วจะเปิดทักษะที่ต่อยอดจากมัน ทักษะที่ล็อกอยู่รอข้อกำหนดเบื้องต้นของตัวเอง",
        },
        review: {
            label: "จังหวะการทบทวน",
            caption: "การทบทวนแต่ละครั้งถูกกำหนดเวลาให้เหมาะกับนักเรียนแต่ละคน ก่อนที่ความจำจะจางลง",
            axisMemory: "ความจำ",
            axisTime: "เวลา",
            reviewDue: "ถึงเวลาทบทวน",
        },
        progress: {
            label: "ความก้าวหน้าของทักษะ",
            caption: "มุมมองเดียวแสดงสิ่งที่นักเรียนแต่ละคนเชี่ยวชาญแล้ว สิ่งที่พร้อมเรียน และสิ่งที่ยังล็อกอยู่",
            example: "ตัวอย่างประกอบ ไม่ใช่ข้อมูลนักเรียนจริง",
            skills: {
                a: "ทักษะ A",
                b: "ทักษะ B",
                c: "ทักษะ C",
                d: "ทักษะ D",
            },
        },
    },
    tagged: {
        eyebrow: "เนื้อหาที่ติดแท็ก",
        title: "บทเรียนถูกติดแท็กอย่างไร",
        description:
            "หนังสือแบบฝึกหัดพิมพ์ทุกเล่มมี 14 บทเรียน เราติดแท็กแต่ละบทเรียนเข้ากับทักษะในกราฟความรู้ของ Mastery Advantage แท็กชุดเดียวกันเชื่อมหนังสือกับฉบับดิจิทัล",
        steps: {
            lesson: {
                title: "บทเรียนในหนังสือ",
                description: "บทเรียนยังเป็นบทเรียนที่พิมพ์และมีครูนำ พร้อมกิจกรรมและบทอ่านของตัวเอง",
            },
            tag: {
                title: "ติดแท็กกับทักษะ",
                description: "แต่ละบทเรียนเชื่อมกับทักษะที่สอนและฝึก ทักษะสอดคล้องกับระดับ CEFR",
            },
            graph: {
                title: "วางในกราฟ",
                description: "กราฟเรียงทักษะตามข้อกำหนดเบื้องต้น เครื่องยนต์จึงรู้ว่าทักษะใดพร้อมเรียนถัดไป",
            },
        },
    },
    adaptivePath: {
        eyebrow: "เส้นทางการเรียนรู้แบบปรับตัว",
        title: "เส้นทางเฉพาะของนักเรียนแต่ละคน",
        description:
            "นักเรียนทุกคนทำตามเส้นทางที่ไม่ซ้ำกันผ่านกราฟทักษะ ระบบแสดงทักษะถัดไปที่พร้อมเรียนตามสิ่งที่พวกเขาเรียนรู้แล้ว — ไม่มีช่องว่าง ไม่มีซ้ำซ้อน",
    },
    spacedRepetition: {
        eyebrow: "การทบทวนแบบเว้นช่วง",
        title: "ทบทวนในเวลาที่เหมาะสม",
        description:
            "FSRS ปรับช่วงทบทวนแต่ละครั้งให้เหมาะกับแต่ละคน เนื้อหาจะแสดงซ้ำในช่วงเวลาก่อนที่จะลืม — ทำให้การจำสะสมและไม่มีอะไรหายไป",
    },
    explorer: {
        eyebrow: "สำรวจกราฟ",
        title: "ดูเส้นทางของนักเรียนหนึ่งคนทีละขั้น",
        description:
            "เลือกวิชา แล้วกดเล่นหรือกดดูทีละขั้น คุณจะเห็นทักษะที่กำลังจะลืม การทบทวนที่ช่วยไว้ และทักษะใหม่ที่เปิดขึ้น",
        labels: {
            idle: "Mastery Advantage ®",
            forgetting: "ใกล้ลืมแล้ว — ทบทวนก่อนที่ความจำจะจางลง",
            reviewing: "กำลังทบทวน…",
            reviewed: "ทบทวนแล้ว! ความจำกลับมาแน่น",
            reviewedTag: "ทบทวนแล้ว ✓",
            ready: "พร้อมเรียน — ผ่านทักษะที่ต้องรู้ก่อนแล้ว",
            readyTag: "พร้อมเรียน!",
            learning: "กำลังเรียน…",
            unlocked: "ปลดล็อกทักษะแล้ว! กำลังคำนวณเส้นทางใหม่…",
            expandedOne: "ปลดล็อกทักษะใหม่ {n} ทักษะ — เส้นทางขยายออก",
            expandedMany: "ปลดล็อกทักษะใหม่ {n} ทักษะ — เส้นทางขยายออก",
            pathUpdated: "อัปเดตเส้นทางแล้ว",
            svgLabel: "กราฟความรู้ Mastery Advantage",
            example: "ตัวอย่างประกอบ ไม่ใช่ข้อมูลนักเรียนจริง",
            planned: "อยู่ในแผน ยังไม่มีกำหนดวัน",
            tabsLabel: "เลือกวิชา",
            controlsLabel: "ปุ่มควบคุมกราฟ",
            play: "เล่น",
            pause: "หยุดชั่วคราว",
            previous: "ขั้นก่อนหน้า",
            next: "ขั้นถัดไป",
            stepOf: "ขั้นที่ {current} จาก {total}",
            whatsNext: "ต่อไปคืออะไร",
            nextTitle: "ต่อไปของนักเรียนคนนี้",
            nextHere: "ตอนนี้อยู่ที่: {cluster}",
            nextReady: "{cluster}: พร้อมเรียน {n} ทักษะ",
            nextNone: "ยังไม่มีทักษะที่พร้อมเรียน",
            states: {
                mastered: "เชี่ยวชาญแล้ว",
                here: "ตอนนี้อยู่ที่นี่",
                ready: "พร้อมเรียน",
                locked: "ยังล็อกอยู่",
            },
        },
    },
    progress: {
        eyebrow: "การติดตามความก้าวหน้า",
        title: "ทุกทักษะ ติดตามและมองเห็นได้",
        description:
            "ครูและผู้ดูแลระบบเห็นว่านักเรียนแต่ละคนเชี่ยวชาญทักษะใด กำลังเรียนอะไร และยังไม่พร้อมเรียนอะไร ไม่ต้องเดา",
    },
    technicalOverview: {
        eyebrow: "วิธีการทำงาน",
        title: "เทคโนโลยีเบื้องหลังเครื่องยนต์",
        description:
            "Mastery Advantage ผสมผสานสองระบบที่พิสูจน์ด้วยงานวิจัยเป็นเครื่องยนต์ปรับตัวเดียวที่จัดตำแหน่งนักเรียน จัดตารางทบทวน และติดตามความชำนาญในผลิตภัณฑ์ของเรา",
        pillars: {
            kst: {
                title: "Knowledge Space Theory",
                description: "ทักษะถูกจัดระเบียบเป็นกราฟกำกับไม่มีวัฏจักรของข้อกำหนดเบื้องต้น นักเรียนสามารถเรียนทักษะได้หลังจากเชี่ยวชาญข้อกำหนดเบื้องต้นทั้งหมด ระบบใช้กราฟนี้เพื่อกำหนดความพร้อมและสร้างเส้นทางการเรียนรู้เฉพาะบุคคล",
            },
            fsrs: {
                title: "การจัดตาราง FSRS",
                description: "Free Spaced Repetition Scheduler สร้างแบบจำลองความจำของนักเรียนแต่ละคนสำหรับทุกทักษะ หลังแต่ละการโต้ตอบ จะอัปเดตการคงที่ที่ทำนายและจัดตารางทบทวนถัดไปที่ช่วงเวลาที่เหมาะสม — ดุลยภาพระหว่างประสิทธิภาพและการคงที่",
            },
            edgeCalibration: {
                title: "การปรับขอบเขต",
                description: "ระบบระบุขอบเขตระหว่างทักษะที่รู้และไม่รู้ผ่านการประเมินแบบกำหนดเป้าหมาย แทนที่จะทดสอบทุกอย่าง ระบบโฟกัสที่ขอบเขตของพื้นที่ความรู้นักเรียนเพื่อจัดตำแหน่งอย่างมีประสิทธิภาพ",
            },
            placement: {
                title: "การจัดตำแหน่งแบบปรับตัว",
                description: "นักเรียนใหม่ถูกจัดอยู่ในระดับที่แท้จริงผ่านการประเมินที่ปรับขอบเขต ระบบระบุอย่างรวดเร็วว่าทักษะใดที่พวกเขาเชี่ยวชาญและทักษะใดที่ยังไม่ สร้างจุดเริ่มต้นเฉพาะบุคคลโดยไม่ต้องทดสอบจัดตำแหน่งยาวนาน",
            },
            proficiency: {
                title: "การประเมินความชำนาญ",
                description: "ความชำนาญถูกวัดอย่างต่อเนื่องผ่านการโต้ตอบของนักเรียน แต่ละการตอบสนองอัปเดตการประมาณความชำนาญทักษะของระบบ ให้มุมมองแบบเรียลไทม์ในความก้าวหน้าของนักเรียน",
            },
        },
    },
    powersEveryProduct: {
        eyebrow: "ใช้งานที่ไหนบ้าง",
        title: "ใช้งานจริงใน CodeCamp Advantage และกำลังเข้าสู่ Primary Advantage",
        description:
            "Mastery Advantage ทำงานในระบบจริงของ CodeCamp Advantage และกำลังเข้าสู่ Primary Advantage ผ่านเนื้อหาที่ติดแท็ก สายผลิตภัณฑ์ที่เปิดใช้งานแล้วคือ Primary Advantage, Reading Advantage และ CodeCamp Advantage",
        cards: {
            codecamp: {
                status: "ใช้งานจริง",
                logoAlt: "โลโก้ CodeCamp Advantage",
                description: "Mastery Advantage ทำงานในระบบจริงของ CodeCamp Advantage",
            },
            primary: {
                status: "กำลังเข้าสู่",
                logoAlt: "โลโก้ Primary Advantage",
                description: "กำลังเข้าสู่ผ่านเนื้อหาที่ติดแท็ก โหมดเงา (shadow mode) ทำงานในภาคเรียนที่ 2 ปี 2026 ฟีเจอร์ปรับตัวตั้งเป้าไว้ที่เดือนพฤษภาคม 2027",
            },
            reading: {
                status: "ยังไม่มี",
                logoAlt: "โลโก้ Reading Advantage",
                description: "ปัจจุบันยังไม่มีใน Reading Advantage จะตามหลัง Primary Advantage โดยยังไม่มีกำหนดวัน",
            },
        },
    },
    cta: {
        eyebrow: "ดูการทำงานจริง",
        title: "ยี่สิบนาที ข้อมูลนักเรียนของคุณ บนหน้าจอของคุณ",
        description:
            "เราจะพาดูว่าเครื่องยนต์ทำงานอย่างไรในวิชาที่คุณสนใจ และแสดงให้เห็นว่าแดชบอร์ดแสดงอะไรบ้าง",
        button: "จองสาธิต 20 นาที",
    },
};

export const zh = {
    hero: {
        eyebrow: "Mastery Advantage",
        title: "始终知道下一步。",
        description:
            "我们课程背后的自适应引擎——结合知识空间理论与 FSRS 间隔重复，为每个学生进行分班、教学和追踪。",
    },
    altTexts: {
        adaptivePath: "自适应学习路径可视化",
        spacedRepetition: "间隔重复可视化",
        progressTracking: "进度追踪可视化",
    },
    video: {
        play: "播放背景视频",
        pause: "暂停背景视频",
    },
    states: {
        mastered: "已掌握",
        here: "你在这里",
        ready: "可以学习",
        locked: "未解锁",
    },
    panels: {
        path: {
            label: "技能图",
            caption: "已掌握的技能会开启依赖它们的技能。未解锁的技能在等待自己的先决条件。",
        },
        review: {
            label: "复习时机",
            caption: "每次复习都按学生个人情况安排，在记忆淡去之前进行。",
            axisMemory: "记忆",
            axisTime: "时间",
            reviewDue: "该复习了",
        },
        progress: {
            label: "技能进度",
            caption: "一个视图展示每个学生已掌握什么、什么已可学习、什么仍未解锁。",
            example: "示意图，并非真实学生数据。",
            skills: {
                a: "技能 A",
                b: "技能 B",
                c: "技能 C",
                d: "技能 D",
            },
        },
    },
    tagged: {
        eyebrow: "已标记的内容",
        title: "一节课如何被标记。",
        description:
            "每本印刷练习册有 14 节课。我们把每节课标记到 Mastery Advantage 知识图中的技能。同样的标记把练习册与它的数字版连接起来。",
        steps: {
            lesson: {
                title: "一节练习册课程",
                description: "这节课仍然是由教师带领的印刷课程，有自己的活动和阅读材料。",
            },
            tag: {
                title: "标记到技能",
                description: "每节课链接到它教授和练习的技能。技能与 CEFR 等级对应。",
            },
            graph: {
                title: "放入图中",
                description: "图按先决条件排列技能，所以引擎知道下一步哪些技能已可学习。",
            },
        },
    },
    adaptivePath: {
        eyebrow: "自适应学习路径",
        title: "每名学生都有自己的路径。",
        description:
            "每个学生都遵循技能图中的独特路径。系统根据他们已经掌握的内容展示下一个准备好学习的技能——没有差距，没有冗余。",
    },
    spacedRepetition: {
        eyebrow: "间隔重复",
        title: "在合适的时刻复习。",
        description:
            "FSRS 为每个人校准每次复习间隔。项目在遗忘之前重新出现——所以记忆不断积累，没有任何内容丢失。",
    },
    explorer: {
        eyebrow: "探索图谱",
        title: "一步步查看一名学生的学习路径。",
        description:
            "选择一个科目，然后播放示例或逐步查看。你会看到一项即将遗忘的技能、挽救它的复习，以及随之解锁的新技能。",
        labels: {
            idle: "Mastery Advantage ®",
            forgetting: "快要忘记了——在记忆淡去之前复习",
            reviewing: "正在复习…",
            reviewed: "已复习！记忆已巩固。",
            reviewedTag: "已复习 ✓",
            ready: "可以学习——先修技能已掌握",
            readyTag: "可以学习！",
            learning: "正在学习…",
            unlocked: "技能已解锁！正在重新计算路径…",
            expandedOne: "解锁了 {n} 项新技能——路径已扩展",
            expandedMany: "解锁了 {n} 项新技能——路径已扩展",
            pathUpdated: "路径已更新",
            svgLabel: "Mastery Advantage 知识图谱",
            example: "示意示例，并非真实学生数据。",
            planned: "计划中，暂无日期",
            tabsLabel: "选择科目",
            controlsLabel: "图谱控制",
            play: "播放",
            pause: "暂停",
            previous: "上一步",
            next: "下一步",
            stepOf: "第 {current} 步，共 {total} 步",
            whatsNext: "下一步是什么",
            nextTitle: "这名学生的下一步",
            nextHere: "当前位置：{cluster}",
            nextReady: "{cluster}：{n} 项可学习",
            nextNone: "暂时没有可学习的技能。",
            states: {
                mastered: "已掌握",
                here: "当前位置",
                ready: "可学习",
                locked: "未解锁",
            },
        },
    },
    progress: {
        eyebrow: "进度追踪",
        title: "每个技能，都可追踪和可见。",
        description:
            "教师和管理员可以准确看到每个学生已经掌握的技能、正在学习的技能以及还没准备好的技能。无需猜测。",
    },
    technicalOverview: {
        eyebrow: "工作原理",
        title: "引擎背后的技术。",
        description:
            "Mastery Advantage 将两个经过研究验证的系统结合为单一自适应引擎，为学生分班、安排复习并追踪我们产品中的熟练度。",
        pillars: {
            kst: {
                title: "知识空间理论",
                description: "技能被组织成先决条件的有向无环图。学生只有在掌握所有先决条件后才能学习某项技能。系统使用此图来确定准备情况并生成个性化学习路径。",
            },
            fsrs: {
                title: "FSRS 调度",
                description: "自由间隔重复调度器为每个学生建模每项技能的记忆。每次交互后，它会更新预测保留率并在合适的间隔安排下次复习——平衡效率和保留率。",
            },
            edgeCalibration: {
                title: "边缘校准",
                description: "系统通过针对性评估识别已知和未知技能之间的边界。系统不测试所有内容，而是专注于学生知识空间的边缘以高效分班。",
            },
            placement: {
                title: "自适应分班",
                description: "新生通过边缘校准评估被安排在真实水平。系统快速识别他们已掌握和未掌握的技能，生成个性化起点，无需冗长的分班测试。",
            },
            proficiency: {
                title: "熟练度评估",
                description: "熟练度通过学生交互持续测量。每次响应都会更新系统对技能熟练度的估计，提供学生进度的实时可见性。",
            },
        },
    },
    powersEveryProduct: {
        eyebrow: "应用范围",
        title: "已在 CodeCamp Advantage 中上线，正进入 Primary Advantage。",
        description:
            "Mastery Advantage 已在 CodeCamp Advantage 的生产环境中运行，并正通过已标记的内容进入 Primary Advantage。我们已上线的产品线是 Primary Advantage、Reading Advantage 和 CodeCamp Advantage。",
        cards: {
            codecamp: {
                status: "已上线",
                logoAlt: "CodeCamp Advantage 标志",
                description: "Mastery Advantage 已在 CodeCamp Advantage 的生产环境中运行。",
            },
            primary: {
                status: "正在进入",
                logoAlt: "Primary Advantage 标志",
                description: "正通过已标记的内容进入。影子模式在 2026 年第二学期运行。自适应功能的目标时间是 2027 年 5 月。",
            },
            reading: {
                status: "暂未",
                logoAlt: "Reading Advantage 标志",
                description: "目前 Reading Advantage 中没有。它将在 Primary Advantage 之后跟进，暂无日期。",
            },
        },
    },
    cta: {
        eyebrow: "查看实际操作",
        title: "二十分钟。你学生的数据，在你的屏幕上。",
        description:
            "我们将展示引擎在你感兴趣的学科中如何工作，并准确展示仪表板呈现的内容。",
        button: "预约20分钟演示",
    },
};
