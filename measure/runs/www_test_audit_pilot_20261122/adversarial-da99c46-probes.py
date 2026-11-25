"""Probe tool of adversarial-da99c46 (www test audit pilot, Phase 4). Labels: P1..P11.
P12 (race loop), P13 (clean full run) and P14 (EACCES proxy) need no edit and are in the log.

Usage: python3 -I mut.py apply <probe> | check <probe> | revert
  apply   writes the edits of one probe and fails when a precondition count is wrong
  check   dry run: counts the old text of every edit, writes nothing
  revert  restores every file any probe can touch with git checkout, then prints git status
"""
import pathlib
import subprocess
import sys

REPO = pathlib.Path("/home/daniebo/Desktop/rama-worktrees/www-test-audit")
APP = "apps/www-reading-advantage"
HOME = f"{APP}/src/locales/pages/home.ts"
FIXTURE = f"{APP}/src/__tests__/fixtures/storytime-page-expected.ts"
LOCALE_TEST = f"{APP}/src/__tests__/www-batch-20261116.locale.test.ts"
POSTS = f"{APP}/src/app/[locale]/(marketing)/blog/posts"
POST_EN = f"{POSTS}/en/she-taps-nest-and-hears-it.md"
POST_TH = f"{POSTS}/th/she-taps-nest-and-hears-it.md"

# The 2027 sentence of the home suite line in each locale, as master wrote it.
EN_2027 = "In the 2027 school year, Thai primary schools open Science Advantage, Math Advantage, and Zhongwen Advantage: workbooks and apps. STEM Advantage is planned."
TH_2027 = "ในปีการศึกษา 2570 โรงเรียนประถมศึกษาไทยจะเปิดใช้ Science Advantage, Math Advantage และ Zhongwen Advantage ทั้งหนังสือแบบฝึกหัดและแอป STEM Advantage อยู่ในแผน"
ZH_2027 = "并通过带标签的内容进入 Primary Advantage。在2027学年，泰国小学开设 Science Advantage、Math Advantage 和 Zhongwen Advantage，配套练习册和应用。"
# The old lines that master replaced.
EN_OLD = "Science, Math, Zhongwen, and STEM Advantage are on our roadmap."
TH_OLD = "Science, Math, Zhongwen และ STEM Advantage อยู่ในแผนงาน"
ZH_OLD = "并通过带标签的内容进入 Primary Advantage。Science、Math、Zhongwen 和 STEM Advantage 在路线图中，暂无日期。"

MONTHS_UNCONTROLLED = ["กุมภาพันธ์", "มีนาคม", "เมษายน", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม"]

# Each edit is (path, old, new, expected count of old).
PROBES = {
    # P1: the 2027 school year of the home copy changes in en and zh. Both scanners must flag it.
    "P1": [
        (HOME, EN_2027, EN_2027.replace("2027", "2028"), 1),
        (HOME, ZH_2027, ZH_2027.replace("2027", "2028"), 1),
    ],
    # P2: the home en line goes back to the old roadmap line. The new rule must flag it.
    "P2": [(HOME, EN_2027, EN_OLD, 1)],
    # P3: the home zh line goes back to the old line with no date.
    "P3": [(HOME, ZH_2027, ZH_OLD, 1)],
    # P4: APPROVED_SCHOOL_YEAR en and zh change. The clearing must stop and the scanner must flag the copy.
    "P4": [
        (FIXTURE, '  en: "In the 2027 school year",', '  en: "In the 2028 school year",', 1),
        (FIXTURE, '  zh: "在2027学年",', '  zh: "在2028学年",', 1),
    ],
    # P5: the Thai month class loses a month that a control names.
    "P5": [(FIXTURE, '  "ธันวาคม",\n];', "];", 1)],
    # P6: two story pictures of one container swap places.
    "P6": [
        (
            FIXTURE,
            '    "week-02-how-many-cakes",\n    "week-03-it-is-red",',
            '    "week-03-it-is-red",\n    "week-02-how-many-cakes",',
            1,
        ),
    ],
    # P7: a named failure for a missing cover image (th) and a missing excerpt (en).
    "P7": [
        (POST_TH, 'coverImage: "/blog/2026-11-23-kitchen-evening.webp"', 'coverImage: "/blog/2026-11-23-no-such-cover.webp"', 1),
        (
            POST_EN,
            'excerpt: "At the kitchen table, a five-year-old meets a word she does not know and turns the page herself."\n',
            "",
            1,
        ),
    ],
    # P8: a YAML syntax error in the en post title.
    "P8": [(POST_EN, 'title: "She Taps “Nest” and Hears It"', 'title: "She Taps “Nest” and Hears It', 1)],
    # F1: edits that no test may catch if the suite is weak. Run with the full suite.
    "P10": [
        # th home year changes: the scanner has no 20xx in a Thai year.
        (HOME, TH_2027, TH_2027.replace("2570", "2571"), 1),
        # th home line gains the Thai roadmap word that en forbids.
        (HOME, "STEM Advantage อยู่ในแผน หน่วยการเรียนรู้แรกของ Storytime Advantage", "STEM Advantage อยู่ในแผนงาน หน่วยการเรียนรู้แรกของ Storytime Advantage", 1),
        # APPROVED_SCHOOL_YEAR th changes.
        (FIXTURE, '  th: "ในปีการศึกษา 2570",', '  th: "ในปีการศึกษา 2571",', 1),
        # Eight of twelve Thai month names leave the scanner list.
        *[(FIXTURE, f'  "{month}",\n', "", 1) for month in MONTHS_UNCONTROLLED],
        # The expected home copy of th in the fixture and the locale test turns to noise.
        (FIXTURE, "ผ่านเนื้อหาที่ติดแท็ก ในปีการศึกษา 2570 โรงเรียนประถมศึกษาไทยจะเปิดใช้ Science Advantage, Math Advantage และ Zhongwen Advantage ทั้งหนังสือแบบฝึกหัดและแอป STEM Advantage อยู่ในแผน หน่วยการเรียนรู้แรกของ", "ZZ-NOISE-FIXTURE-TH-HOME", 1),
        (LOCALE_TEST, "ผ่านเนื้อหาที่ติดแท็ก ในปีการศึกษา 2570 โรงเรียนประถมศึกษาไทยจะเปิดใช้ Science Advantage, Math Advantage และ Zhongwen Advantage ทั้งหนังสือแบบฝึกหัดและแอป STEM Advantage อยู่ในแผน หน่วยการเรียนรู้แรกของ", "ZZ-NOISE-LOCALE-TEST-TH-HOME", 1),
        # A figure picture of the en post points at a file that does not exist.
        (POST_EN, "src: /blog/2026-11-23-decodable-nest.webp", "src: /blog/2026-11-23-no-such-figure.webp", 1),
    ],
    # P11: F1a without the figure edit, plus noise in the dead copy data. A strong suite catches none of it silently.
    "P11": [
        (HOME, TH_2027, TH_2027.replace("2570", "2571"), 1),
        (HOME, "STEM Advantage อยู่ในแผน หน่วยการเรียนรู้แรกของ Storytime Advantage", "STEM Advantage อยู่ในแผนงาน หน่วยการเรียนรู้แรกของ Storytime Advantage", 1),
        (FIXTURE, '  th: "ในปีการศึกษา 2570",', '  th: "ในปีการศึกษา 2571",', 1),
        *[(FIXTURE, f'  "{month}",\n', "", 1) for month in MONTHS_UNCONTROLLED],
        (FIXTURE, '    home: "Primary Advantage, Reading Advantage, and CodeCamp', '    home: "ZZ-NOISE-EN-HOME. Primary Advantage, Reading Advantage, and CodeCamp', 1),
        (FIXTURE, '    home: "Primary Advantage, Reading Advantage และ CodeCamp', '    home: "ZZ-NOISE-TH-HOME. Primary Advantage, Reading Advantage และ CodeCamp', 1),
        (FIXTURE, '    home: "Primary Advantage、Reading Advantage 和 CodeCamp', '    home: "ZZ-NOISE-ZH-HOME. Primary Advantage、Reading Advantage 和 CodeCamp', 1),
        (LOCALE_TEST, '    en: "Primary Advantage, Reading Advantage, and CodeCamp Advantage are live.', '    en: "ZZ-NOISE-ROWB-EN. Primary Advantage, Reading Advantage, and CodeCamp Advantage are live.', 1),
        (LOCALE_TEST, '    th: "Primary Advantage, Reading Advantage และ CodeCamp Advantage เปิดใช้งานแล้ว', '    th: "ZZ-NOISE-ROWB-TH. Primary Advantage, Reading Advantage และ CodeCamp Advantage เปิดใช้งานแล้ว', 1),
        (FIXTURE, '    description: "Storytime Advantage is an English app for Anuban 2 to P2, ages 4 to 8.', '    description: "ZZ-NOISE-OVERVIEW. Storytime Advantage is an English app for Anuban 2 to P2, ages 4 to 8.', 1),
    ],
    # P9: the 2027 school year clause leaves the home line in all three locales. Full suite.
    "P9": [
        (HOME, EN_2027, EN_2027.replace("In the 2027 school year, Thai", "Thai"), 1),
        (HOME, TH_2027, TH_2027.replace("ในปีการศึกษา 2570 ", ""), 1),
        (HOME, ZH_2027, ZH_2027.replace("在2027学年，", ""), 1),
    ],
}

TOUCHED = sorted({edit[0] for edits in PROBES.values() for edit in edits})


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=REPO, check=True, capture_output=True, text=True).stdout


def apply(name: str, write: bool) -> None:
    pending: dict[str, str] = {}
    for path, old, new, count in PROBES[name]:
        text = pending.get(path) or (REPO / path).read_text(encoding="utf-8")
        found = text.count(old)
        if found != count:
            sys.exit(f"PRECONDITION FAILED {name}: {path}: expected {count}, found {found}: {old[:70]!r}")
        pending[path] = text.replace(old, new)
        print(f"ok {name}: {path.split('/')[-1]}: {old[:50]!r} -> {new[:50]!r}")
    if write:
        for path, text in pending.items():
            (REPO / path).write_text(text, encoding="utf-8")
        print(f"APPLIED {name}: {len(pending)} file(s) written")
    else:
        print(f"CHECK {name}: all preconditions hold, nothing written")


def revert() -> None:
    git("checkout", "--", *TOUCHED)
    status = git("status", "--short")
    print("git status --short after revert:", repr(status))
    if status.strip():
        sys.exit("TREE NOT CLEAN")
    print("TREE CLEAN")


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "revert":
        revert()
    elif mode in ("apply", "check"):
        apply(sys.argv[2], write=(mode == "apply"))
    else:
        sys.exit("usage: apply|check <probe> | revert")
