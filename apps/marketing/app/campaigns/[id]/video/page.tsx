"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  addScene as addSceneFn,
  removeScene as removeSceneFn,
  reorderScenes as reorderScenesFn,
} from "@/lib/scene-editor";
import { scriptSchema, type ScriptScene } from "@/lib/script-schema";
import { getMarketingMessage as t } from "@/lib/i18n";
import { useHandleAuthFailure } from "@/lib/login-redirect";
import type { Campaign } from "@/lib/campaign-schema";
import { SceneEditor } from "./scene-editor";
import { ScriptStep } from "./script-step";
import { TopicStep, type Topic } from "./topic-step";

interface VideoProject {
  id: string;
  campaignId: string;
  topic: string;
  script: ScriptScene[];
  status: "draft" | "in-progress" | "complete";
  createdAt?: string;
  updatedAt: string;
}

const emptyScene: ScriptScene = {
  narration: "",
  imagePrompt: "",
  motionDirection: t("video.defaultMotionDirection"),
};

let nextSceneId = 0;

/**
 * Creates an ID used only for the current scene editor session.
 * @returns A unique local scene ID.
 */
function createSceneId(): string {
  nextSceneId += 1;
  return `scene-${nextSceneId}`;
}

/**
 * Reads a server-provided message from a workflow error response.
 * @param response The failed response to inspect.
 * @param fallback The message to use when the response has no message.
 * @returns The server message for HTTP 400 or 422 responses or the fallback.
 */
async function readBadRequestMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  if (response.status !== 400 && response.status !== 422) return fallback;

  try {
    const data: unknown = await response.json();
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

/**
 * Renders the Marketing video-production workflow.
 * @returns The topic, script, and scene editing interface.
 */
export default function VideoProductionPage() {
  const handleAuthFailure = useHandleAuthFailure();
  const params = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState("reading-advantage");

  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [script, setScript] = useState<ScriptScene[]>([]);
  const [hasUnsavedScript, setHasUnsavedScript] = useState(false);
  const [sceneIds, setSceneIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTopics, setSavingTopics] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [projectMessage, setProjectMessage] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      const campaignId = params.id as string;
      void fetchCampaign(campaignId);
      void fetchProjects(campaignId);
    }
  }, [params?.id]);

  useEffect(() => {
    if (!hasUnsavedScript) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedScript]);

  useEffect(() => {
    if (!hasUnsavedScript) return;

    const handleNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link || link.target === "_blank") return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const destination = new URL(href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href
      ) {
        return;
      }

      if (!window.confirm(t("video.unsavedChanges"))) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", handleNavigation, true);
    return () => document.removeEventListener("click", handleNavigation, true);
  }, [hasUnsavedScript]);

  const fetchCampaign = async (id: string) => {
    setWorkflowError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (handleAuthFailure(res)) {
        return;
      }
      if (res.status === 403) {
        setWorkflowError(t("video.access"));
        return;
      }
      if (!res.ok) {
        setWorkflowError(t("video.loadFailed"));
        return;
      }
      const data: unknown = await res.json();
      if (
        !data ||
        typeof data !== "object" ||
        typeof (data as { app?: unknown }).app !== "string"
      ) {
        setWorkflowError(t("video.invalidCampaign"));
        return;
      }
      setCampaign(data as Campaign);
      setSelectedApp((data as Campaign).app);
    } catch {
      setWorkflowError(t("video.loadFailed"));
    }
  };

  const fetchProjects = async (campaignId: string) => {
    setProjectsLoading(true);
    setProjectError(null);
    try {
      const res = await fetch(
        `/api/video/projects?campaignId=${encodeURIComponent(campaignId)}`,
      );
      if (handleAuthFailure(res)) {
        return;
      }
      if (res.status === 403) {
        setProjectError(t("video.projectsAccess"));
        return;
      }
      if (!res.ok) {
        setProjectError(t("video.projectsLoadFailed"));
        return;
      }

      const data: unknown = await res.json();
      if (!Array.isArray(data)) {
        setProjectError(t("video.projectsInvalid"));
        return;
      }

      const validProjects = data.filter((value): value is VideoProject => {
        if (!value || typeof value !== "object") return false;
        const candidate = value as Partial<VideoProject>;
        return (
          typeof candidate.id === "string" &&
          typeof candidate.campaignId === "string" &&
          typeof candidate.topic === "string" &&
          scriptSchema.safeParse(candidate.script).success
        );
      });
      setProjects(validProjects);
    } catch {
      setProjectError(t("video.projectsLoadFailed"));
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId || null);
    setProjectError(null);
    setProjectMessage(null);
    if (!projectId) return;

    const project = projects.find((candidate) => candidate.id === projectId);
    if (!project) {
      setProjectError(t("video.projectUnavailable"));
      return;
    }

    const topicId = `project-topic-${project.id}`;
    setTopics([
      {
        id: topicId,
        text: project.topic,
        approved: true,
        editing: false,
      },
    ]);
    setActiveTopicId(topicId);
    const projectScript = project.script.map((scene) => ({ ...scene }));
    setScript(projectScript);
    setHasUnsavedScript(false);
    setSceneIds(projectScript.map(() => createSceneId()));
    setSavedProjectId(project.id);
    setProjectMessage(t("video.projectLoaded", { id: project.id }));
  };

  const handleResearchTopics = async () => {
    setLoading(true);
    setWorkflowError(null);
    setWorkflowMessage(null);
    try {
      const res = await fetch("/api/video/research-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: selectedApp }),
      });
      if (handleAuthFailure(res)) {
        return;
      }
      if (res.status === 403) {
        setWorkflowError(t("video.researchForbidden"));
        return;
      }
      if (!res.ok) {
        setWorkflowError(
          await readBadRequestMessage(res, t("video.researchFailed")),
        );
        return;
      }
      const data: unknown = await res.json();
      if (
        !data ||
        typeof data !== "object" ||
        !Array.isArray((data as { topics?: unknown }).topics)
      ) {
        setWorkflowError(t("video.researchInvalid"));
        return;
      }
      const researchedTopics = (data as { topics: unknown[] }).topics;
      if (!researchedTopics.every((topic) => typeof topic === "string")) {
        setWorkflowError(t("video.researchInvalid"));
        return;
      }
      setTopics(
        researchedTopics.map((text, i) => ({
          id: `topic-${i}`,
          text: text as string,
          approved: false,
          editing: false,
        })),
      );
    } catch {
      setWorkflowError(t("video.researchRequestFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (id: string) => {
    setTopics((prev) =>
      prev.map((topic) => (topic.id === id ? { ...topic, approved: true } : topic)),
    );
  };

  const handleReject = (id: string) => {
    setTopics((prev) => prev.filter((topic) => topic.id !== id));
  };

  const handleEdit = (id: string) => {
    setTopics((prev) =>
      prev.map((topic) => (topic.id === id ? { ...topic, editing: true } : topic)),
    );
  };

  const handleTopicChange = (id: string, text: string) => {
    setTopics((prev) =>
      prev.map((topic) => (topic.id === id ? { ...topic, text } : topic)),
    );
  };

  const handleSaveEdit = (id: string) => {
    setTopics(
      (prev) =>
        prev.map((topic) =>
          topic.id === id ? { ...topic, editing: false } : topic,
        ),
    );
  };

  const handleSaveTopics = async () => {
    setWorkflowError(null);
    setWorkflowMessage(null);
    setSavingTopics(true);
    try {
      const approvedTopics = topics.filter((topic) => topic.approved);
      const res = await fetch("/api/video/save-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: selectedApp,
          topics: approvedTopics.map((topic) => topic.text),
        }),
      });
      if (handleAuthFailure(res)) {
        return;
      }
      if (res.status === 403) {
        setWorkflowError(t("video.saveTopicsForbidden"));
        return;
      }
      if (!res.ok) {
        setWorkflowError(t("video.saveTopicsFailed"));
        return;
      }
      setWorkflowMessage(t("video.topicsSaved"));
    } catch {
      setWorkflowError(t("video.saveTopicsFailed"));
    } finally {
      setSavingTopics(false);
    }
  };

  const handleGenerateScript = async () => {
    const topic = topics.find((topic) => topic.id === activeTopicId);
    if (!topic) return;
    setGenerating(true);
    setWorkflowError(null);
    setWorkflowMessage(null);
    setSavedProjectId(null);
    setSelectedProjectId(null);
    setProjectMessage(null);
    setProjectError(null);
    try {
      const res = await fetch("/api/video/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: selectedApp, topic: topic.text }),
      });
      if (handleAuthFailure(res)) {
        return;
      }
      if (res.status === 403) {
        setWorkflowError(t("video.scriptForbidden"));
        return;
      }
      if (!res.ok) {
        setWorkflowError(t("video.scriptInvalid"));
        return;
      }
      const data: unknown = await res.json();
      const parsedScript = scriptSchema.safeParse(
        data && typeof data === "object"
          ? (data as { script?: unknown }).script
          : undefined,
      );
      if (!parsedScript.success) {
        setWorkflowError(t("video.scriptResponseInvalid"));
        return;
      }
      setScript(parsedScript.data);
      setHasUnsavedScript(true);
      setSceneIds(parsedScript.data.map(() => createSceneId()));
    } catch {
      setWorkflowError(t("video.scriptFailed"));
    } finally {
      setGenerating(false);
    }
  };

  const handleSceneChange = (index: number, patch: Partial<ScriptScene>) => {
    setHasUnsavedScript(true);
    setScript((prev) =>
      prev.map((scene, i) => (i === index ? { ...scene, ...patch } : scene)),
    );
  };

  const handleAddScene = () => {
    setHasUnsavedScript(true);
    setScript((prev) => addSceneFn(prev, { ...emptyScene }));
    setSceneIds((prev) => [...prev, createSceneId()]);
  };

  const handleRemoveScene = (index: number) => {
    setHasUnsavedScript(true);
    setScript((prev) => removeSceneFn(prev, index));
    setSceneIds((prev) => prev.filter((_, sceneIndex) => sceneIndex !== index));
  };

  const handleMoveScene = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= script.length) return;
    setHasUnsavedScript(true);
    setScript((prev) => reorderScenesFn(prev, fromIndex, toIndex));
    setSceneIds((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return [...prev];
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSaveScript = async () => {
    if (!campaign?.id || !activeTopicId) return;
    const topic = topics.find((topic) => topic.id === activeTopicId);
    if (!topic) return;

    const method = selectedProjectId ? "PATCH" : "POST";
    setSaving(true);
    setProjectError(null);
    setProjectMessage(null);
    try {
      const res = await fetch("/api/video/projects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(selectedProjectId ? { id: selectedProjectId } : {}),
          campaignId: campaign.id,
          topic: topic.text,
          script,
        }),
      });
      if (handleAuthFailure(res)) {
        return;
      }
      if (res.status === 403) {
        setProjectError(t("video.projectSaveForbidden"));
        return;
      }
      if (!res.ok) {
        setProjectError(
          method === "PATCH"
            ? t("video.projectUpdateFailed")
            : t("video.projectSaveFailed"),
        );
        return;
      }

      const data: unknown = await res.json();
      if (
        !data ||
        typeof data !== "object" ||
        typeof (data as { id?: unknown }).id !== "string"
      ) {
        setProjectError(t("video.projectResponseInvalid"));
        return;
      }

      const project = data as VideoProject;
      setSavedProjectId(project.id);
      setSelectedProjectId(project.id);
      setHasUnsavedScript(false);
      setProjects((current) => {
        const withoutSaved = current.filter((item) => item.id !== project.id);
        return [...withoutSaved, { ...project, topic: topic.text, script }];
      });
      setProjectMessage(
        method === "PATCH"
          ? t("video.projectUpdated", { id: project.id })
          : t("video.projectSaved", { id: project.id }),
      );
    } catch {
      setProjectError(
        method === "PATCH"
          ? t("video.projectUpdateFailed")
          : t("video.projectSaveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!campaign) {
    return workflowError ? (
      <p role="alert">{workflowError}</p>
    ) : (
      <p role="status">{t("campaigns.loading")}</p>
    );
  }

  const approvedTopics = topics.filter((topic) => topic.approved);
  const activeTopic = topics.find((topic) => topic.id === activeTopicId);

  return (
    <div>
      <h1>{t("video.title", { name: campaign.name })}</h1>
      {workflowError && (
        <p role="alert" style={{ color: "#b91c1c", marginTop: "8px" }}>
          {workflowError}
        </p>
      )}
      {workflowMessage && (
        <p aria-live="polite" style={{ color: "#15803d", marginTop: "8px" }}>
          {workflowMessage}
        </p>
      )}

      <section
        aria-labelledby="existing-projects-heading"
        style={{
          marginTop: "24px",
          padding: "24px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2 id="existing-projects-heading">{t("video.existingProjects")}</h2>
        <label htmlFor="existing-project-select" style={{ display: "block" }}>
          {t("video.existingProjectsLabel")}
        </label>
        <select
          id="existing-project-select"
          value={selectedProjectId ?? ""}
          onChange={(event) => handleSelectProject(event.target.value)}
          disabled={projectsLoading}
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            marginTop: "8px",
            minWidth: "240px",
          }}
        >
          <option value="">
            {projectsLoading
              ? t("video.loadingProjects")
              : t("video.chooseProject")}
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.topic}
            </option>
          ))}
        </select>
        {projectError && (
          <p role="alert" style={{ color: "#b91c1c", marginTop: "8px" }}>
            {projectError}
          </p>
        )}
        {projectMessage && (
          <p aria-live="polite" style={{ color: "#15803d", marginTop: "8px" }}>
            {projectMessage}
          </p>
        )}
      </section>

      <TopicStep
        selectedApp={selectedApp}
        onSelectApp={setSelectedApp}
        researching={loading}
        topics={topics}
        activeTopicId={activeTopicId}
        savingTopics={savingTopics}
        hasApprovedTopics={approvedTopics.length > 0}
        onResearch={handleResearchTopics}
        onApprove={handleApprove}
        onReject={handleReject}
        onEdit={handleEdit}
        onTopicChange={handleTopicChange}
        onSaveEdit={handleSaveEdit}
        onSaveTopics={handleSaveTopics}
        onSelectTopic={setActiveTopicId}
      />

      <ScriptStep
        hasApprovedTopics={approvedTopics.length > 0}
        activeTopicText={activeTopic?.text ?? null}
        hasScript={script.length > 0}
        generating={generating}
        saving={saving}
        selectedProjectId={selectedProjectId}
        savedProjectId={savedProjectId}
        projectMessage={projectMessage}
        onGenerate={handleGenerateScript}
        onSaveScript={handleSaveScript}
      >
        {script.length > 0 && (
          <SceneEditor
            script={script}
            sceneIds={sceneIds}
            onSceneChange={handleSceneChange}
            onAddScene={handleAddScene}
            onRemoveScene={handleRemoveScene}
            onMoveScene={handleMoveScene}
          />
        )}
      </ScriptStep>
    </div>
  );
}
