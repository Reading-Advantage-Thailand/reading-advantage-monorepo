# Zhongwen graph sources (Phase 0, 2026-10-06)

Read-only research for Z1 and Z3. The graph itself is built in Phase 1 (2027-01-11 to 2027-02-05).

## YCT (Youth Chinese Test)

| Level | Words (stated) | Use in the graph |
|---|---|---|
| YCT 1 | about 80 | Book 1 vocabulary and character nodes; the P3 and P4 entry level |
| YCT 2 | about 150 (cumulative) | Second-year scope; nodes present, not in Book 1 |
| YCT 3 | about 300 | Out of scope for 2027 |
| YCT 4 | about 600 | Out of scope |

Sources: [Sheffield Confucius Institute, YCT](https://sheffield.ac.uk/confucius/proficiency-tests/yct); [LingoAce YCT guide](https://www.lingoace.com/blog/yct-test-guide/); [DigMandarin YCT 1 vocabulary list](https://www.digmandarin.com/yct-1-vocabulary-list.html).

YCT 1 list (80 words, from DigMandarin; to be checked against the official syllabus before the graph is pinned): nouns 家 学校 商店 中国人 爸爸 妈妈 哥哥 姐姐 老师 手 口 眼睛 头发 耳朵 鼻子 个子 猫 狗 鸟 鱼 水 牛奶 米饭 面条 苹果 今天 明天 现在 月 号 星期 点; verbs 谢谢 再见 是 有 看 吃 喝 去 叫 爱 喜欢 认识; adjectives 好 多 大 小 长 高 高兴; pronouns 我 你 他 她 我们 这 那 哪 谁 什么 几; numerals 一 to 十; measure words 个 岁; adverbs 不 很; conjunction 和; preposition 在; particles 的 吗.

## Thailand Ministry of Education Chinese framework

The 2014 Chinese Language Teaching Development Plan sets Chinese as a supplementary subject in primary education with at least two class hours per week, focused on listening and speaking and on interest; junior high gets at least four hours per week across the four skills. Over 2,000 Thai primary and secondary schools offer Chinese. Source: [IJSASR article](https://so07.tci-thaijo.org/index.php/IJSASR/article/download/3564/2847). The official framework document itself was not fetched; the workbooks session or the contracted Chinese reviewers should confirm the current (post-2024) framework title before the graph's `aligned_to_standard` edges are written.

## Node ID pattern (SPECIFICATION.md §3.6)

`zhongwen.yct.1.vocab.<pinyin-kebab>`, `zhongwen.char.<unicode-hex>`, `zhongwen.grammar.<pattern-kebab>`, `zhongwen.reading.yct1.<cando-kebab>`; domain `zhongwen.yct`. Characters carry `metadata.radical`, `metadata.strokeCount`, `metadata.components[]`; component characters get `prerequisite_for` edges to compound characters. HSK 3.0 band labels go in `alignmentRefs`.
