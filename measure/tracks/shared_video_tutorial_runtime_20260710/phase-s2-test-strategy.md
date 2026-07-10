# Phase S2 Test Strategy: Interactive Video for React

## Component boundary

`@reading-advantage/activity-react` depends on React and
`@reading-advantage/activity-runtime/core`, but never on Next, Vinext, database,
authentication, or media-provider SDK packages. Provider controllers are injected
ports. The hosted adapter wraps `HTMLMediaElement`; the YouTube adapter wraps the
approved IFrame API surface supplied by a host.

## Red matrix

1. Freeze controller, playback snapshot, watched-range sampler, cue, checkpoint,
   transcript, diagram, replay, and provider-error contracts.
2. Enforce policy: YouTube questions may pause but never hard-gate; hosted media
   hard-gates only with activity approval metadata.
3. Render semantic player controls, progress, checkpoint question/feedback,
   timestamp replay, diagram, transcript, resource remediation, and errors.
4. Prove keyboard activation, focus movement/restoration, live announcements,
   captions/transcript alternatives, reduced-motion state, and touch-size hooks.
5. Prove bounded sampling, watched-range merging, cue crossing after seek, reconnect,
   and controller cleanup without per-second persistence.
6. Recursively reject Next, Vinext, database, auth, and provider SDK imports.

## Browser acceptance

The live Codecamp host must be exercised with the in-app browser. Required evidence:

- play/pause and seek across a timestamp checkpoint;
- incorrect answer, immediate feedback, diagram, and replay loop;
- correct retry and non-blocking YouTube continuation;
- transcript/captions alternative and keyboard-only operation;
- persistence after reload and reconnect behavior;
- mobile viewport and reduced-motion behavior;
- screenshots before checkpoint, during remediation, after completion, and on mobile.

No S2 acceptance is allowed from jsdom tests alone.
