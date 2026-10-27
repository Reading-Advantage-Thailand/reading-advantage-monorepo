# Carry-over from the void build (branch storytime/own-app)

These records exist only on the branch storytime/own-app; master keeps them here before the branch is pruned (plan task 7.3).

## Take-down decisions S31 to S34 (2026-10-24 evening)

- S31 STOP and BURN. Daniel stopped all work and all peers ("Fucking stop"), then: "I am completely
  unhappy with everything that has been produced. Let's start there. Burn it all down except the
  (very expensive) models. The motions suck. Those need to be rewritten. Come up with a set of rules
  about the generation." The delete list is check RU3 and the fate of the app code is RU2 on the
  approval page. Nothing is deleted before his pass.
- S32 AUDIT. An independent Opus audit listed 156 items (approval page section AUDIT). Daniel:
  "EVERYTHING needs to be audited." Every item gets a recorded check; items that need a person are
  marked for the person in rule 6.6.
- S33 TAKE DOWN. Daniel: "take down the live storytime site now." Done for storytime-app: public
  invoker removed 19:44 and ingress set to internal 19:45:55 Bangkok; storytime.reading-advantage.com
  and the run.app URL return 404. Undo: `--ingress=all` plus the allUsers run.invoker binding.
  OPEN: Primary revision 00141-nuh still serves the Storytime pages at
  primary.reading-advantage.com/th/st/...; removing them needs a Primary deploy or a rollback, which
  is Daniel's decision.
- S34 MODEL PRE-CHECK. Daniel's rule 6.7 in generation-rules.md: a multimodal model checks every
  sound, video, and picture before a person does; calibrated on the known bad files first.
- Phoneme bank: Daniel did noise reduction and amplification on the raw recording himself and added
  the missing /b/ at the end of the file (no longer between /h/ and /f/). The bank is cut again from
  his file under rules 5 and 6.7; the old 45 cuts are replaced, not patched.

Source: commit 0c5fd9bf8, decisions.md.

## Uncommitted player fix (speak.ts)

The worktree /home/daniebo/Desktop/rama-worktrees/storytime has an uncommitted change in apps/storytime/lib/storytime/speak.ts, function playStretch. The stop timer counts from the real audio position (audio.currentTime) and not from the word start, because with preload="none" the first play resolves after a load and a queued seek, so a timer from the start stopped a later word early (Daniel's BA1 finding, 2026-10-24). The rebuild player must keep this behavior.

```diff
diff --git a/apps/storytime/lib/storytime/speak.ts b/apps/storytime/lib/storytime/speak.ts
index 52e0d5ded..1683b6810 100644
--- a/apps/storytime/lib/storytime/speak.ts
+++ b/apps/storytime/lib/storytime/speak.ts
@@ -45,7 +45,10 @@ export function playStretch(audio: HTMLAudioElement, start: number, end: number)
   audio.addEventListener("timeupdate", check);
   seekOrWait(audio, start);
   audio.play().then(() => {
-    timer = setTimeout(stop, ((end + WORD_TAIL - start) / (audio.playbackRate || 1)) * 1000);
+    // Count from the real position: with preload="none" the first play resolves after a load and
+    // a queued seek, so a timer from `start` would stop a later word early (owner, BA1 2026-10-24).
+    const from = Number.isFinite(audio.currentTime) && audio.currentTime > 0 ? audio.currentTime : start;
+    timer = setTimeout(stop, ((end + WORD_TAIL - from) / (audio.playbackRate || 1)) * 1000);
   }, stop);
   return stop;
 }
```
