/** Default locale used by the Marketing client. */
const defaultLocale = "en";

const messages = {
  en: {
    "shell.checkingAccess": "Checking Marketing access...",
    "shell.accessRequired": "Marketing access required",
    "shell.accessDescription":
      "Your company account is signed in, but it does not currently have a Marketing role. Ask an Accounts administrator to grant MEMBER or ADMIN access.",
    "shell.platform": "Marketing Platform",
    "shell.marketing": "Marketing",
    "shell.settings": "Settings",
    "shell.campaigns": "Campaigns",
    "metadata.title": "Marketing Production Platform",
    "metadata.description":
      "Human-in-the-loop marketing production for Reading Advantage",
    "home.title": "Marketing Production Platform",
    "home.description":
      "Welcome to the Reading Advantage marketing production system.",
    "login.companyAccess": "READING ADVANTAGE / COMPANY ACCESS",
    "login.title": "Marketing sign in",
    "login.description":
      "Continue to Accounts with your company username and password.",
    "login.continue": "CONTINUE WITH ACCOUNTS",
    "login.errorSso": "Company sign-in failed. Please try again.",
    "settings.adminView":
      "Administrator access is required to view Marketing settings.",
    "settings.loadFailed":
      "Failed to load Marketing settings. Please try again.",
    "settings.invalidResponse": "Settings returned an invalid response.",
    "settings.adminSave":
      "Administrator access is required to save Marketing settings.",
    "settings.saveCheckFailed":
      "Failed to save Marketing settings. Check the values and try again.",
    "settings.saved": "Settings saved.",
    "settings.saveFailed":
      "Failed to save Marketing settings. Please try again.",
    "settings.checkingAccess": "Checking administrator access...",
    "settings.redirecting": "Redirecting to sign in...",
    "settings.accessRequired": "Settings access required",
    "settings.accessDescription":
      "Administrator access is required to view or change Marketing settings.",
    "settings.loading": "Loading settings...",
    "settings.title": "Settings",
    "settings.description": "Configure LLM provider, API keys, and tool paths.",
    "settings.configuration": "LLM Configuration",
    "settings.provider": "Provider",
    "settings.google": "Google",
    "settings.openai": "OpenAI",
    "settings.openrouter": "OpenRouter",
    "settings.modelName": "Model Name",
    "settings.modelPlaceholder": "e.g., gemini-pro, gpt-4",
    "settings.apiKey": "API Key",
    "settings.configured": "(configured — enter a new value to change)",
    "settings.enterApiKey": "Enter API key",
    "settings.enterNewApiKey": "Enter a new API key to test the connection.",
    "settings.mmxPath": "mmx CLI Path",
    "settings.mmxPlaceholder": "e.g., /usr/local/bin/mmx",
    "settings.testing": "Testing...",
    "settings.testConnection": "Test Connection",
    "settings.save": "Save Settings",
    "settings.saving": "Saving...",
    "settings.testForbidden":
      "Error: administrator access is required to test connections.",
    "settings.testFailed":
      "Error: connection test failed. Check the provider settings and try again.",
    "settings.testSuccessful": "Connection successful!",
    "settings.connectionFailed": "Connection failed",
    "campaigns.access": "You do not have access to Marketing campaigns.",
    "campaigns.loadFailed": "Failed to load campaigns. Please try again.",
    "campaigns.invalidResponse": "Campaigns returned an invalid response.",
    "campaigns.createForbidden":
      "You do not have permission to create campaigns.",
    "campaigns.createCheckFailed":
      "Failed to create campaign. Check the form and try again.",
    "campaigns.created": "Campaign created.",
    "campaigns.createFailed": "Failed to create campaign. Please try again.",
    "campaigns.title": "Campaigns",
    "campaigns.empty": "No campaigns yet.",
    "campaigns.createCampaign": "Create Campaign",
    "campaigns.newCampaign": "New Campaign",
    "campaigns.type": "Type",
    "campaigns.app": "App",
    "campaigns.name": "Name",
    "campaigns.namePlaceholder": "Campaign name",
    "campaigns.create": "Create",
    "campaigns.creating": "Creating...",
    "campaigns.updating": "Updating...",
    "campaigns.cancel": "Cancel",
    "campaigns.video": "Video",
    "campaigns.infocard": "Infocard",
    "campaigns.detailAccess": "You do not have access to this campaign.",
    "campaigns.detailLoadFailed":
      "Failed to load campaign. Please return to Campaigns and try again.",
    "campaigns.detailInvalidResponse": "Campaign returned an invalid response.",
    "campaigns.updateForbidden":
      "You do not have permission to update this campaign.",
    "campaigns.updateFailed":
      "Failed to update campaign status. Please try again.",
    "campaigns.updateInvalidResponse":
      "Campaign update returned an invalid response.",
    "campaigns.moved": "Campaign moved to {status}.",
    "campaigns.loading": "Loading...",
    "campaigns.back": "← Back to Campaigns",
    "campaigns.status": "Status",
    "campaigns.statusTransitions": "Status Transitions",
    "campaigns.moveTo": "Move to {status}",
    "campaigns.startVideo": "Start Video Production",
    "video.access": "You do not have access to this campaign.",
    "video.loadFailed": "Failed to load campaign. Please try again.",
    "video.invalidCampaign": "Campaign returned an invalid response.",
    "video.projectsAccess":
      "You do not have access to this campaign's projects.",
    "video.projectsLoadFailed":
      "Failed to load saved projects. Please try again.",
    "video.projectsInvalid": "Saved projects returned an invalid response.",
    "video.projectUnavailable": "The selected project is no longer available.",
    "video.projectLoaded": "Loaded project {id}",
    "video.researchForbidden": "You do not have permission to research topics.",
    "video.researchFailed":
      "Topic research did not produce five new topics. Please try again.",
    "video.researchInvalid": "Topic research returned an invalid response.",
    "video.researchRequestFailed":
      "Failed to research topics. Please try again.",
    "video.saveTopicsForbidden": "You do not have permission to save topics.",
    "video.saveTopicsFailed":
      "Failed to save approved topics. Please try again.",
    "video.topicsSaved": "Approved topics saved.",
    "video.scriptForbidden": "You do not have permission to generate scripts.",
    "video.scriptInvalid":
      "Script generation did not return a valid Thai script. Please try again.",
    "video.scriptResponseInvalid":
      "Script generation returned an invalid response.",
    "video.scriptFailed": "Failed to generate a script. Please try again.",
    "video.projectSaveForbidden":
      "You do not have access to save this project.",
    "video.projectUpdateFailed":
      "Failed to update the project. Please try again.",
    "video.projectSaveFailed": "Failed to save the project. Please try again.",
    "video.projectResponseInvalid":
      "The project was saved but returned an invalid response.",
    "video.projectUpdated": "Updated project {id}",
    "video.projectSaved": "Saved as project {id}",
    "video.unsavedChanges":
      "You have unsaved script changes. Leave this page anyway?",
    "video.title": "Video Production: {name}",
    "video.existingProjects": "Existing Projects",
    "video.existingProjectsLabel": "Existing projects",
    "video.loadingProjects": "Loading projects...",
    "video.chooseProject": "Choose a saved project",
    "video.stepSelectApp": "Step 1: Select App",
    "video.stepResearch": "Step 2: Research Topics",
    "video.researchDescription": "LLM will propose 5 topics relevant to {app}.",
    "video.researching": "Researching...",
    "video.researchTopics": "Research Topics",
    "video.proposedTopics": "Proposed Topics",
    "video.approve": "Approve",
    "video.edit": "Edit",
    "video.reject": "Reject",
    "video.approved": "✓ Approved",
    "video.selectedForScript": "Selected for Script",
    "video.useForScript": "Use for Script",
    "video.saveApprovedTopics": "Save Approved Topics",
    "video.moveSceneUp": "Move scene up",
    "video.moveSceneDown": "Move scene down",
    "video.stepGenerate": "Step 3: Generate Script",
    "video.approveTopicFirst": "Approve a topic in Step 2 first.",
    "video.generateDescription":
      "Generating a Thai marketing script (5–7 scenes) for the selected approved topic.",
    "video.selectedTopic": "Selected topic:",
    "video.generating": "Generating...",
    "video.generateScript": "Generate Script",
    "video.updating": "Updating...",
    "video.saving": "Saving...",
    "video.updateScript": "Update Script",
    "video.saveScript": "Save Script",
    "video.projectReady": "Project {id} is ready to update.",
    "video.scene": "Scene {number}",
    "video.delete": "Delete",
    "video.narration": "Narration (Thai)",
    "video.imagePrompt": "Image Prompt (English)",
    "video.motionDirection": "Motion Direction",
    "video.defaultMotionDirection": "Static",
    "video.addScene": "Add Scene",
    "app.reading-advantage": "Reading Advantage",
    "app.primary-advantage": "Primary Advantage",
    "app.storytime": "Storytime",
    "app.math-advantage": "Math Advantage",
    "app.science-advantage": "Science Advantage",
    "app.stem-advantage": "STEM Advantage",
    "app.zhongwen-advantage": "Zhongwen Advantage",
    "app.tutor-advantage": "Tutor Advantage",
    "status.draft": "draft",
    "status.in-progress": "in-progress",
    "status.complete": "complete",
    "status.archived": "archived",
  },
};

type MessageKey = keyof typeof messages.en;
type MessageValues = Readonly<Record<string, string | number>>;

const hasOwnMessage = (key: string): key is MessageKey =>
  Object.prototype.hasOwnProperty.call(messages[defaultLocale], key);

const lookupMessage = (key: string): string | undefined => {
  if (!hasOwnMessage(key)) return undefined;
  const value = messages[defaultLocale][key];
  return typeof value === "string" ? value : undefined;
};

/**
 * Replaces named placeholders without interpreting replacement-string tokens.
 * @param template Message text containing named placeholders.
 * @param values Values used to replace the named placeholders.
 * @returns The template with each matching placeholder replaced exactly.
 */
export function interpolateMarketingMessage(
  template: string,
  values: MessageValues,
): string {
  return template.replace(/\{([^{}]+)\}/g, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name])
      : token,
  );
}

/**
 * Returns a localized Marketing message with optional placeholder values.
 * @param key Typed message identifier from the Marketing dictionary.
 * @param values Values used to replace named placeholders in the message.
 * @returns The localized message text.
 */
export function getMarketingMessage(
  key: MessageKey,
  values?: MessageValues,
): string {
  const template = lookupMessage(key);
  if (template === undefined) return key;
  if (!values) return template;
  return interpolateMarketingMessage(template, values);
}

/**
 * Returns the localized display name for a Marketing application identifier.
 * @param app Application identifier from the shared app catalog.
 * @returns The localized application name, or the identifier when unknown.
 */
export function getMarketingAppName(app: string): string {
  return lookupMessage(`app.${app}`) ?? app;
}

/**
 * Returns the localized display label for a campaign status identifier.
 * @param status Campaign status identifier returned by the API.
 * @returns The localized status label, or the identifier when unknown.
 */
export function getMarketingStatusLabel(status: string): string {
  return lookupMessage(`status.${status}`) ?? status;
}

export { defaultLocale };
