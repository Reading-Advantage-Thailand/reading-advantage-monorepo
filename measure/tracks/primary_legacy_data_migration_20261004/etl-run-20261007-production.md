# ETL run on the production copy of 2026-10-07

Source `primary_legacy_20261007`: a Cloud SQL export of production made 2026-10-07 00:31 UTC, after the
production load of the 222 Workbooks packages and the re-inject of bank-3 b012 and Origins 3.2 p08
(Workbooks 888c138 checked all 250 packages with legacy ids and E12 in it). Target `primary_etl_20261007`,
new, migrated with integration 8b718dafa (71 migrations). Two runs; the second changed no counts.
`primary_etl_prod` keeps the 2026-10-06 result.

Compared with the 2026-10-06 copy: 622 articles (582), 39,180 MCQ rows read (38,780). Two of the 40 new
articles are not Workbooks packages (cmuwt3qcu0000s601nc8qcjkq "Ben Helps in the Shop",
cmuwt44pn000ms601ayaklmek "The Happy Red Shoes", made in production 2026-10-06 15:01); the owner was asked
who made them.

`primary_legacy_id_map` rows by table_name: article 622, multiple_choice_questions 6216,
short_answer_questions 3110, long_answer_questions 3104, sentencs_and_words_for_flashcard 622.

Not in this run: the legacy flashcards (decks and cards). The owner chose on 2026-10-07 to move them into
the Primary flashcard store; that step comes in a later run into the same target.

## Report of the second run

Started 2026-10-07T00:44:11.825Z, finished 2026-10-07T00:44:16.437Z.

| Legacy table | Read | Written | Skipped |
|---|---|---|---|
| schools | 7 | 7 | 0 |
| users | 671 | 663 | 8 role 'user' needs an owner assignment (D9) |
| accounts | 30 | 19 | 7 provider 'google' not copied (D8: no Google sign-in); 8 user not migrated; 4 created from users.password |
| school_admins | 4 | 4 | 0 |
| classrooms | 33 | 29 | 4 no teacher and no school admin (spec §6 classrooms rule; assign one with --teachers); 10 teacher_id fell back to the school admin |
| classroom_teachers | 19 | 19 | 0 |
| classroom_students | 643 | 577 | 66 classroom not migrated |
| licenses | 2 | 2 | 0 |
| article → articles | 622 | 622 | 0 |
| multiple_choice_questions | 39180 | 6216 | 4 answer not among the options (spec §6 MCQ rule); 32960 story chapter question (stories deferred) |
| short_answer_questions | 19590 | 3110 | 16480 story chapter question (stories deferred) |
| long_answer_questions | 19584 | 3104 | 16480 story chapter question (stories deferred) |
| sentencs_and_words_for_flashcard | 3918 | 622 | 3296 story chapter row (stories deferred) |
| article_activity_logs | 539 | 539 | 0 |
| assignments | 14 | 8 | 4 classroom not migrated; 2 teacher not migrated |
| assignment_students → student_assignments | 336 | 167 | 169 assignment not migrated |
| user_lesson_progress → lesson_progress | 280 | 257 | 23 duplicate (user, article); the latest row kept |
| user_activities → user_activity | 2770 | 2349 | 421 duplicate (user, type, target); the latest row kept (null targets are distinct) |
| xp_logs | 2672 | 2672 | 111 null activityId kept as null activity_id |

## Skipped rows (legacy ids, up to 20 per reason)

- users, role 'user' needs an owner assignment (D9): cmgqpnzsy0006t79b5cp5xaq2, cmh9i3g150000t7yovd2175m3, cmi8lqsmx0000s60drint5bto, cmirfnckg0004s60djfkf7ewd, cmk1z8qwf0000s60dyx13dt3k, cmkj7a8ws0000s6012llpjhxf, cmogmjiwk0004s601kfa67xly, cmqzi5yh30005s601p8n82or7
- accounts, provider 'google' not copied (D8: no Google sign-in): cmgqqp1qb000pt79bwqo7sium, cmh06h4xb0002s60d9dfyj88t, cmh1nwfkp0002s60d0dowgrs9, cmpc0xn3m000es601a4mwcea1, cms1dyqsl0002s601lx4q2l14, cmlul2vhr0002s601vrslxm2s, cmqp283p20003s601d7z6gdgg
- accounts, user not migrated: cmlsbdxri0007t7buce8qeglh, cmqzi5yhb0007s6010g6375s9, cmogmjiwq0006s601iqvbol71, cmkj7a8xe0002s601su328pau, cmirfnckl0006s60d1mjlqug5, cmlsbdxvh000bt7budrs8ajhj, cmlsbdyfj000vt7bu4d96p6u7, cmh9i3g3f0002t7yo0z11g9vj
- classrooms, no teacher and no school admin (spec §6 classrooms rule; assign one with --teachers): cmhj507q00000t7tvfmjlctck, cmhm5bi0q0001t7tv6y6o2dmc, cmhwuko0p000ds60dha8z70ig, cmhwuko0p000cs60d0u548cwz
- classrooms, teacher_id fell back to the school admin: cmhmf2ig50004t71zrpjmlk0o, cmhnx34j70000t7307jlnmor4, cmhnxybpr0001t7307e3pnfxy, cmhxctzfc0001t7tgbv79seko, cmhxcvcme0002t7tgwiukjndy, cmhxdd1wj0007t7tggnsc2v17, cmi381ld2000as60dn77q4jvb, cmi381ld2000bs60d9cs55q8r, cmi38hnlq000fs60de7uwvftb, cmi38hnlq000gs60dis6qfgr2
- classroom_students, classroom not migrated: cmier0z85009ut7vz93nemhlw, cmier0z85009vt7vzfm45o7mx, cmier0z85009wt7vze5cjczq1, cmier0z85009xt7vzvdlxvvnl, cmier0z85009yt7vzd2bfhx20, cmier0z85009zt7vzr2jbyomc, cmier0z8500a0t7vzy92ytpqh, cmier0z8500a1t7vzuv5us6p5, cmier0z8500a2t7vz6lgz2z9m, cmier0z8500a3t7vzhjq6upf8, cmier0z8500a4t7vz2gjqpj0p, cmier0z8500a5t7vz5yal2e10, cmier0z8500a6t7vzd7vitket, cmier0z8500a7t7vzlw82r7pk, cmier0z8500a8t7vzuvznvb36, cmier0z8500a9t7vz8det8sgr, cmier0z8500aat7vzo3i0zw1b, cmier0z8500abt7vz9ztkclun, cmier0z8500act7vzes98r7vd, cmier0z8500adt7vz9fy75njd, …
- multiple_choice_questions, answer not among the options (spec §6 MCQ rule): cmgqtfb1400jot79b2b8vt3wx, cmorc24e10021s6012hxz5jhi, cmou6yrgv0049s601qg1b3hx5, cmqqrw1h1000us6011cslsbeh
- multiple_choice_questions, story chapter question (stories deferred): cmlv529md0051s601xmvw37tk, cmll556si0144s601le94vlwq, cmlv529mc0049s601r767ibcz, cmlv529mc004as601mdy45ofb, cmlgun9rw00mus6017sfzk3cm, cmlgun9rw00mvs6011ed2bpc4, cmlgun9rw00mws601id37r3mb, cmlgun9rw00mxs601njw1dvqc, cmlgun9rw00mys601sleuns69, cmlgun9rx00mzs60107sy7d33, cmlgun9rx00n0s601zg4ds1x7, cmlgun9rx00n1s601p280izv4, cmlgun9rx00n2s601bz6saqej, cmlgun9rx00n3s601c3mnpsh5, cmlgun9ry00ngs601tphs3mqu, cmlgun9ry00nhs601won4za2n, cmlgun9ry00nis601kx9hlvup, cmlgun9ry00njs601egn41rbl, cmlgun9ry00nks601nidmgrxc, cmlgun9ry00nls6018rlquzdx, …
- short_answer_questions, story chapter question (stories deferred): cmp016xgz0178s601lnomo684, cmp016xgz0179s601e5pmgjwu, cml15uou7000ct7z58tbmtjax, cml15uou7000dt7z5iteprin9, cml15uou7000et7z5zgkrjixw, cml15uou7000ft7z5reht7u6x, cml15uou7000gt7z5ak2y369w, cml15uou8000yt7z581c4tr7q, cml15uou8000zt7z578kvlzph, cml15uou80010t7z5uu3ycark, cml15uou80011t7z57tuif7uf, cml15uou80012t7z5mhxsyhvh, cml15uou8001kt7z5hq179iym, cml15uou8001lt7z55c5bl4e0, cml15uou8001mt7z5hnye2swf, cml15uou8001nt7z5zcpl3zll, cml15uou8001ot7z5pwnk16ub, cml15uou90026t7z5f45gabtm, cml15uou90027t7z5n8lrnrxc, cml15uou90028t7z588p73yfh, …
- long_answer_questions, story chapter question (stories deferred): cmlia40qq00ops601kew5sskv, cml15uou7000ht7z5lqqsn451, cml15uou7000it7z5mfwbz2p5, cml15uou7000jt7z5z0q4hti2, cml15uou7000kt7z5ad8jai02, cml15uou7000lt7z5n4weo9zx, cml15uou80013t7z5wwlqjy1v, cml15uou80014t7z5gwgb0vuh, cml15uou80015t7z54xohx1hu, cml15uou80016t7z5imi6aa4z, cml15uou80017t7z5syzceuuy, cml15uou8001pt7z5st08y411, cml15uou8001qt7z5r3l2sn9y, cml15uou8001rt7z5q4s9nabc, cml15uou8001st7z53f3o81lz, cml15uou8001tt7z55llxun0d, cml15uou9002bt7z5slqe0opp, cml15uou9002ct7z55z0ktoop, cml15uou9002dt7z58l5e9eex, cml15uou9002et7z5txvqpx2m, …
- sentencs_and_words_for_flashcard, story chapter row (stories deferred): cmnm0hzkv00vys601qkv20elh, cmnm0hzt700x6s6017cn0lcf0, cmpcvsxug00vms601dskid04d, cmo7gdigi010ss601p100cf0a, cmtg25lqx00t8s601elgpxc9k, cmmnpzrft00shs601w9yy1o3p, cmnm0i0cn00zms601tzm2mqur, cmnm0i0i60108s601pfirfza7, cmp5qo3mc0160s6012tcyefjl, cmn3893pq00n9s6019msbzgrd, cmp5qo3md0178s601inesbxc3, cmn389f4v00ums601b0ttcajy, cmn389dij00tes6013d6dkw2w, cmp5qo3me017us6013obh31oa, cmn389eo600u0s601kcthj5pq, cmn389dfq00rks601edmu0m1r, cmo378r2v01cus601ccbeejsa, cmo378r2u01c8s6012a7rox8g, cmn389cti00qcs6018qvjmgok, cmn3ei1iu004as601m49r7k8y, …
- assignments, classroom not migrated: cmio3z56h0001s60dfwyk9gci, cmk7wk3wu0014s601a2ylhxom, cmk7wkjsk0023s601nzxpvml8, cmlt6pr8x0001s601dsnmg2fo
- assignments, teacher not migrated: cmirl4sc5000ts60d7zuiqpjb, cmirl5zte001ds60di4cuggmz
- assignment_students, assignment not migrated: cmio3z56m0002s60ddnb4zy81, cmio3z56m0003s60d1jjdwulp, cmio3z56m0005s60d9xmunu46, cmio3z56m0006s60d96bw11vb, cmio3z56m0007s60dm4oa307y, cmio3z56m0008s60dylg4y0rr, cmio3z56m000bs60d0i0enwjb, cmio3z56m000cs60dfdn0hs9n, cmio3z56m000ds60dx4ju8qd0, cmio3z56n000es60dn6dbushd, cmio3z56n000fs60dq5uv46wf, cmio3z56n000gs60dgme2kt94, cmio3z56n000hs60dl0f8k3gg, cmio3z56n000is60d9qbgwcya, cmio3z56n000ks60dqlsguz5p, cmio3z56n000ls60dik6qdvt5, cmio3z56n000ns60dlzb927sr, cmio3z56n000os60dqsmcwsub, cmio3z56n000ps60df80no3lw, cmio3z56n000qs60dh1zm2her, …
- user_lesson_progress, duplicate (user, article); the latest row kept: cmin30isd0037s60dq4u7zinl, cmioec55y0031s60d11y1qpmr, cmiof6905006bs60d6qsfgsdj, cmj1g8d97000fs60dvkbvgdx5, cmizyp3xt001xs60d42jl54ot, cmiyjlj200023s60dieo7ly9c, cmityohm5000ns60dfffo01md, cmistrdyl0005s60d5mvpyw3i, cmirlxhla001ys60ddfo44pha, cmixb511600rns60djo5uswhu, cmhqw668d001at7itg035hu4w, cmizfmfw60001s60dft0vr1z0, cmjlcddji000hs60d6e03wo68, cmk8319y30031s601jrg7ar83, cmizs1yfk0007s60dmahc4zer, cmitn5a2q0001s60da3j1qddx, cmiy0lrn90001s60de2gff04u, cmipur6a6000js60d3guv3gkz, cmj013mbm0041s60dxnk3k7vb, cmiyiw94u0001s60d1ne9bfrt, …
- user_activities, duplicate (user, type, target); the latest row kept (null targets are distinct): cmgz5e2qb002ct7boc382rnpe, cmin3lh640043s60d9ou1qsv6, cmin3osxn004hs60dc8gpetap, cmiof16hn005vs60dl8xf5mj9, cmioedj6w003ns60dp9uw4x8l, cmiof3ish0063s60duyq4uoh8, cmioeu0kj005fs60dejht2iav, cmiof7y98006ns60dyox0faph, cmiokbvj400d4s60ddbk90ltt, cmiomyvak00egs60duphwtgtg, cmiolacy900des60df1g0rukm, cmis7loit001hs60d946oq9lt, cmis7loln001ls60dqchee952, cmisunszb001ns60dxzxaf5fu, cmtr7b02s005hs601i086glbp, cmtr7f44f0069s601ulniwzyv, cmu188bka001ls601bapdfb3k, cmiuylth6000ps60d51w3z0n2, cmiuys00e000ts60d79o86ah8, cmiztf088001fs60d7p6uaurq, …
- xp_logs, null activityId kept as null activity_id: cmuwxdccc00prs601a98rhokw, cmuwxdccn00pvs601rqvh2dwj, cmuwxdccz00pzs601jg2hng88, cmuwxdcdb00q3s6019upa8tsh, cmuwxdcdm00q7s601hx9g5k1s, cmuwxdce100qbs6019zmcsj28, cmuwxdcee00qhs601sapmomzi, cmuwxdces00qns6010wwhqsma, cmuwxdcf300qrs601x7iw0pb3, cmuwxdcff00qvs601vnbceorp, cmuwxdcfq00qzs60143hqp6sa, cmuwxdcg100r3s601m62vsyj9, cmuwxdcge00r9s60120yypxr9, cmuwxdcgr00rfs601yzg2fgjs, cmuwxdch300rjs601gt57k5my, cmuwxdche00rns601jj9a2yp6, cmuwxdchr00rrs601i3at11i0, cmuwxdci200rvs601fxnexls3, cmuwxdcie00rzs601z7ht9j6r, cmuwxdcip00s3s601qjjyrby3, …

## Dropped or deferred

- sessions: spec §6: everyone signs in again
- verifications: spec §6: not moved; 0 rows in April
- logs: operational service logs, no user data
- roles: the shared schema keeps the role on users.role (D9)
- _UserActivityToXPLogs: no link table in the shared schema; xp_logs.activity_id keeps the link
- validation_runs: cron validator state
- contact_messages: no target; export for the sales team is an owner decision
- ai_providers: AI configuration comes from the environment
- ai_task_configs: AI configuration comes from the environment
- leaderboards: snapshot data; the app recomputes it
- game_rankings: legacy table in the target; the play kit keeps its own ledger
- ai_insights: JSON title and description have no text target (inventory R6); deferred
- stories, story_chapters: deferred: the new app has no stories page (docs/primary-whats-moved.md); chapter questions and flashcard rows go with them
- flashcard_decks, flashcard_cards, card_reviews, cloze_test_games: deferred: FSRS state has no target columns (inventory R2); an owner decision
- learning_goals, goal_milestones, goal_progress_logs, assignment_notifications: 0 rows in April; loaded by a later run if production has rows

## Notes

- lesson_progress.lesson_id holds the new article uuid as text (inventory R10 decision).
- 622 legacy articles carry their legacy id in articles.image (D10).
