> Copied unchanged from branch storytime/own-app, commit 0c5fd9bf8, path measure/tracks/storytime_advantage_program_20261021/generation-rules.md (2026-10-27).

# Storytime generation rules (draft 2, 2026-10-24 evening)

Status: rule 6.7 is Daniel's rule (2026-10-24 19:46, in chat): "There are hundreds of multimodal
models that we could use to do a first-pass check before me, not wasting my time with obvious
garbage, right? Make a rule in the track for that." All other rules are draft 2 and wait for
Daniel's pass (approval page, check RU4). The audit items in [brackets] are in the approval page
section AUDIT.

Draft 1 plus the faults that the independent audit found (156 items). The number in [brackets]
after a rule is the audit item that the rule answers. Scope: every song, video, animation clip,
sound file, word time, picture, book, stage file, check, and record made for Storytime. The 3D
cast models are kept. Everything else is made again under these rules.

## 0. Order of work
0.1 Make ONE week end to end to the full standard first: song, video, book audio, pictures,
    player, checks. The owner passes that week before any other week starts. [153]
0.2 No batch production of weeks before 0.1 passes. [30, 153]
0.3 A section of the owner page that has no answer is open. Silence is never a pass. [152]

## 1. Analyse the source before you derive anything
1.1 Every song has a measured analysis file next to its mp3: BPM, downbeat (beat 1 of the bar,
    not only the first beat), bar grid, sections, key, sung range, and the onset of every sung
    word. A script in git makes the file. [1, 2, 3, 4, 5]
1.2 Word onsets come from forced alignment against the lyric text (a phoneme aligner, not a
    speech recogniser with the lyric as a prompt) and an energy check. A word that the aligner
    cannot place is listed by name, not filled with even spacing. [18, 19, 20, 17]
1.3 No time is typed by hand. A hand correction goes into a corrections file in git with the
    reason, and the script applies it. [21]
1.4 Every song has a 2-bar instrumental intro, asked for in the music prompt. [6]

## 2. Time every visual event to the grid
2.1 A cut lands on a bar start or on a declared beat, never on a lyric-line start.
2.2 An object appears on the onset of the word that names it, after the question that asks for it.
2.3 A motion cycle is a whole number of beats; its accent lands on the beat.
2.4 A check script asserts that every cut, reveal, and accent is within 30 ms of its grid target.
    A miss fails the build. [29, 32]
2.5 The scene renders at the frame rate of the final video. [28]
2.6 The video and the times it was rendered from are one version. A change of times makes the
    old render invalid; the build refuses it. [41]

## 3. Author motion for music
3.1 Every gesture clip has a reference tempo, a length in beats, and an accent beat.
3.2 The idle between lines is a beat bounce. No frozen figure, no two-frame swap. [23]
3.3 Each gesture shows the meaning of its line. The gesture list per line goes to the owner
    with the storyboard (6.3). [25, 26]
3.4 Mouth shapes follow the sung sounds (visemes from the aligned phonemes), not an open-close
    per word. [27]

## 4. Build the scene for real
4.1 Every scene reads as its place at a glance (sky: dome, horizon, clouds, ground; park: path,
    trees; classroom: walls, board, low tables of a kindergarten). [37]
4.2 Every object the lyric names is a real asset, in the count the lyric says. A person counts
    it in the frame. [34]
4.3 No picture card or code-drawn shape stands in for a missing asset. A missing asset blocks
    the render. [35, 39]
4.4 Every song opens with an establishing wide shot of 1 to 2 bars and a title card, with audio
    fades at the title card and the end card. [43]
4.5 Every camera key keeps every named singer in frame. A still per camera key is checked. [33]
4.6 Light, sun, and place are set in every stage file; no silent default. [31]

## 5. Process audio like a studio
5.1 Record with 5 s of room tone. Reduce noise on the whole raw file once, before any cut. The
    owner may do this step himself when he offers.
5.2 One loudness target for every sound a child hears in Storytime (songs, books, phonemes):
    -16 LUFS integrated, true peak at or below -1 dBTP. Gain above 12 dB is a re-record. [13, 67, 76]
5.3 Gate before upload: noise floor below -60 dBFS, no clipping, 10 ms fades, one sample rate,
    mp3 at 192 kbps or better. The gate prints the numbers. A person listens to every file.
5.4 A phoneme file holds the sound and at most 50 ms of silence on each side. [75]
5.5 The cutter, the noise step, and the gate are scripts in git. [77]
5.6 Each narration take is chosen by a person who listens, not by the shortest pause. [69]

## 6. Verify like the owner will
6.1 Every deliverable has a named check that a person can fail: watch the cut with a click
    overlay, hear every word, look at every frame. The check, the person, and the time are
    recorded. [42, 146]
6.2 An automated count is labelled "automated" and is never acceptance. [128, 60]
6.3 A storyboard sheet (one frame per line, bar of the cut, scene, cast, object, word time,
    gesture) goes to the owner before any render.
6.4 Nothing goes to the bucket or into a revision before the check in 6.1 passed. [72, 143]
6.5 Nothing goes to the owner page that the agent side has not opened, played, and checked on
    that page first. [9, 11, 36, 147]
6.6 The agent that makes a file cannot hear or watch it. Every listen and watch step has three
    stages in this order: (1) measurement scripts (alignment, loudness, noise floor, beat grid,
    frame checks); (2) the model pre-check of rule 6.7; (3) the person the owner names. A file
    that fails stage 1 or 2 goes back to production. It never reaches the person.
6.7 Model pre-check before the owner (Daniel's rule, 2026-10-24). Every sound, video, and picture
    goes through a first-pass check by a multimodal model (native audio, video, and image input)
    before the owner or his reviewer sees or hears it.
    a. The model gets the file itself, the text the file must match (lyric, sentence, word,
       phoneme label, line, object and count), and a written rubric for that kind of file.
    b. Each rubric lists the known faults of its kind. Word cut: the whole word, no part of the
       next word, no clipped start. Phoneme: the right sound, no hiss, hum, or clipping, no extra
       sound. Song: every word sung as written, the instrumental intro, no artefacts, clear
       diction for a 5-year-old learner. Video: cuts on the beat, the named object visible after
       the question, the scene reads as its place, motion in time with the music, no frozen or
       hidden figure. Picture: the named object in the stated count, no deformed hands or faces,
       no wrong text. Book audio: the text read as written, child speed, natural question and
       answer.
    c. The model gives pass or fail for each item with the reason and the time in the file. A
       fail goes back to production with that reason.
    d. Calibration first: a rubric counts only after it fails the known bad files (the cut-off
       "Hello" of BA1, the hissy 04-n.mp3, the week 2 cut 1 of C1W2, the gesture thumbnail for
       "One sun") and passes a file that the owner passed. A rubric that passes a known bad file
       is fixed and calibrated again.
    e. The model and its price are named before the run and logged in the cost ledger (7.3).
       Release files get a second model from another provider; a file passes when both pass.
    f. The result is labelled "model pre-check". It is never acceptance; the person in 6.1 stays
       the final gate. A peer's statement that it ran the check is not the check: the run log
       with the model output is attached to the delivery.

## 7. Record honestly
7.1 A plan task is [x] only when the owner passed it, or when the note states the evidence class
    (owner-passed, person-checked, automated, peer-report). [149, 150]
7.2 A peer's self-report or a generator's self-report never closes a task. [10, 46, 151]
7.3 Every paid call is logged with purpose and price before it runs, in one cost ledger. [156]
7.4 Plan, spec, and design state what exists now. A changed decision updates them the same day. [155, 121]

## 8. Teaching content
8.1 The lyric sheet and the book text are the master. A take that differs from the text is
    rejected; the text is never changed to match a generator. [7]
8.2 Every English line is correct English that a child may copy. A person reads every line
    aloud before generation. [8, 101]
8.3 The decodable ratio counts only words spelled with taught letters. Tricky words count
    separately, with a cap per book. [98, 102]
8.4 A regular word is never a tricky word because its letters come later; the book avoids it
    until then. A phonics specialist reviews the tricky list. [99, 100]
8.5 Thai is written or checked by a Thai reader the owner names (design FR-4), page by page,
    with the record of who read what. [105, 106, 107, 108]
8.6 Song and book of one week agree on counts and words. [52]
8.7 The phonics graph stays "draft" until a phonics specialist reviews it; it cites the source
    frameworks, not our own design. [113-120]

## 9. Pictures
9.1 Every song line and every book page that names an object shows that object. A gesture
    thumbnail is never a "line picture". [48, 49, 50]
9.2 A person counts the objects in every picture against the text. [51]
9.3 A picture file is named for what it shows, not for the gesture. [26]

## 10. Book audio and the player
10.1 Each page is read as one recording in context (question and answer together), at
     kindergarten speed, by a voice the owner chose for Storytime. A slow version is a real
     slow reading, and the app plays it. [62, 63, 64, 68]
10.2 A word end is measured from the sound (the energy drop), never taken from the next word's
     start. The word tap plays from 30 ms before the start to the measured end. [54, 55, 56]
10.3 The player supports every sentence on a page. A test uses a shipped two-sentence page. [53, 138]
10.4 A failed sound shows a message; no silent catch. [81, 86, 87]
10.5 The phone voice is never the fallback for content audio. [85]

## 11. Checks and tests
11.1 A check counts only after it is shown to fail on a broken copy (a cut word, a missing file,
     a wrong sentence). [131, 132, 133, 135, 137]
11.2 Checks run against the bucket and the live build, never against routed local files, and
     record the URL and the commit they ran on. [129, 136, 89]
11.3 Tests load the shipped week files, not hand-made fixtures. [124, 126, 127]
11.4 No test mocks the code under test. [123]
11.5 Sound and touch checks run on one real iPhone and one low-cost Android. [139, 82]

## 12. Publish and relay
12.1 The owner's approval is recorded in the source repo that holds the content. No receive step
     changes a status. [141, 110]
12.2 A changed media file gets a new file name (a version number). No overwrite under the same
     name. [88]
12.3 A message to a peer quotes the owner's words exactly and names the one item they cover. A
     "go" covers only the item the owner named. Commit messages quote the owner exactly. [142]
12.4 Media upload is checked file by file against the bucket (size and type) before a build. [89, 90]
