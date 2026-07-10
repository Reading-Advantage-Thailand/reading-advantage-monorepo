export const validActivity = {
  schemaVersion: "activity.v1",
  activityId: "activity.git-commit-demo",
  activityVersion: "1.0.0",
  graphVersion: "codecamp.graph.v1",
  objectiveId: "git.commit.create",
  variantKey: "git-commit.video.v1",
  mode: "worked_example",
  title: { en: "Create a commit", th: "สร้าง commit" },
  accessibility: {
    transcriptRequired: true,
    captionsRequired: true,
    nonVideoAlternativeResourceId: "diagram.commit-flow"
  },
  resources: [
    {
      kind: "video",
      resourceId: "video.commit-demo",
      provider: "youtube",
      videoId: "abc123",
      transcriptResourceId: "transcript.commit-demo",
      segments: [
        { segmentId: "segment.stage", label: { en: "Stage files" }, startSeconds: 12, endSeconds: 35 },
        { segmentId: "segment.commit", label: { en: "Commit" }, startSeconds: 36, endSeconds: 64 }
      ]
    },
    {
      kind: "transcript",
      resourceId: "transcript.commit-demo",
      language: "en",
      text: "Stage the files, then create a commit."
    },
    {
      kind: "diagram",
      resourceId: "diagram.commit-flow",
      alt: { en: "Working tree to staging area to repository" },
      assetId: "codecamp.diagram.commit-flow.v1"
    }
  ],
  checkpoints: [
    {
      checkpointId: "checkpoint.stage",
      stepId: "ido.stage-prediction",
      objectiveId: "git.commit.create",
      variantKey: "git-commit.checkpoint.v1",
      trigger: { resourceId: "video.commit-demo", segmentId: "segment.stage" },
      question: {
        kind: "single_choice",
        prompt: { en: "What does git add do?" },
        options: [
          { optionId: "stage", label: { en: "Stages changes" } },
          { optionId: "publish", label: { en: "Publishes changes" } }
        ],
        correctOptionIds: ["stage"]
      },
      feedback: {
        correct: { en: "Yes — it stages changes." },
        incorrect: { en: "Review the staging step." }
      },
      remediation: [
        { kind: "video_segment", resourceId: "video.commit-demo", segmentId: "segment.stage" },
        { kind: "diagram", resourceId: "diagram.commit-flow" }
      ],
      evidence: { behavior: "assessed", weight: 0.5 },
      gate: "pause_non_blocking"
    }
  ],
  tutorialSteps: [
    {
      stepId: "wedo.stage",
      order: 1,
      objectiveId: "git.commit.create",
      variantKey: "git-commit.tutorial.v1",
      instruction: { en: "Stage README.md." },
      resourceRefs: [{ kind: "diagram", resourceId: "diagram.commit-flow" }],
      checks: [{ checkId: "check.staged", kind: "git_status", expected: "README.md:staged" }],
      hints: [{ hintId: "hint.stage", text: { en: "Use git add." } }],
      reveals: [{ revealId: "reveal.command", text: { en: "Run git add README.md" } }],
      scaffoldLevel: 2
    },
    {
      stepId: "wedo.commit",
      order: 2,
      objectiveId: "git.commit.create",
      variantKey: "git-commit.tutorial.v1",
      instruction: { en: "Create the commit." },
      resourceRefs: [{ kind: "video_segment", resourceId: "video.commit-demo", segmentId: "segment.commit" }],
      checks: [{ checkId: "check.commit", kind: "git_log", expected: "count>=1" }],
      hints: [],
      reveals: [],
      scaffoldLevel: 1
    }
  ]
} as const;
