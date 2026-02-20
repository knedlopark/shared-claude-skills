import { loadConfig, loadConfigForProject, JiraConfig } from "./jira-client.js";

// === INTERFACES ===

export interface JiraVersion {
  id: string;
  name: string;
  description?: string;
  archived: boolean;
  released: boolean;
  releaseDate?: string;
  startDate?: string;
  projectId: number;
  self: string;
}

export interface CreateVersionInput {
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  released?: boolean;
}

export interface UpdateVersionInput {
  name?: string;
  description?: string;
  archived?: boolean;
  released?: boolean;
  releaseDate?: string;
  startDate?: string;
}

// === PRIVATE HELPERS ===

function getAuthHeader(config: JiraConfig): string {
  return `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString("base64")}`;
}

async function request<T>(
  config: JiraConfig,
  method: string,
  endpoint: string,
  body?: unknown
): Promise<T> {
  const url = `${config.url}/rest/api/3${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: getAuthHeader(config),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jira API error (${response.status}): ${error}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// === PUBLIC FUNCTIONS ===

/**
 * Získá seznam všech verzí projektu.
 */
export async function getVersions(projectKey: string): Promise<JiraVersion[]> {
  const config = loadConfigForProject(projectKey);
  return request<JiraVersion[]>(config, "GET", `/project/${projectKey}/versions`);
}

/**
 * Vyhledá verzi podle názvu.
 */
export async function getVersionByName(
  projectKey: string,
  versionName: string
): Promise<JiraVersion | null> {
  const versions = await getVersions(projectKey);
  return versions.find((v) => v.name === versionName) || null;
}

/**
 * Vytvoří novou verzi v projektu.
 */
export async function createVersion(
  projectKey: string,
  data: CreateVersionInput
): Promise<JiraVersion> {
  const config = loadConfigForProject(projectKey);

  // Získáme project ID (potřebujeme ho pro vytvoření verze)
  const projects = await request<{ id: string; key: string }[]>(config, "GET", "/project");
  const project = projects.find((p) => p.key.toUpperCase() === projectKey.toUpperCase());

  if (!project) {
    throw new Error(`Projekt "${projectKey}" nebyl nalezen.`);
  }

  const body: Record<string, unknown> = {
    name: data.name,
    projectId: parseInt(project.id, 10),
  };

  if (data.description) body.description = data.description;
  if (data.startDate) body.startDate = data.startDate;
  if (data.releaseDate) body.releaseDate = data.releaseDate;
  if (data.released !== undefined) body.released = data.released;

  return request<JiraVersion>(config, "POST", "/version", body);
}

/**
 * Aktualizuje existující verzi.
 */
export async function updateVersion(
  versionId: string,
  data: UpdateVersionInput,
  projectKeyHint?: string
): Promise<JiraVersion> {
  // Použijeme hint pro výběr správné instance, jinak výchozí
  const config = projectKeyHint ? loadConfigForProject(projectKeyHint) : loadConfig();

  const body: Record<string, unknown> = {};

  if (data.name !== undefined) body.name = data.name;
  if (data.description !== undefined) body.description = data.description;
  if (data.archived !== undefined) body.archived = data.archived;
  if (data.released !== undefined) body.released = data.released;
  if (data.releaseDate !== undefined) body.releaseDate = data.releaseDate;
  if (data.startDate !== undefined) body.startDate = data.startDate;

  return request<JiraVersion>(config, "PUT", `/version/${versionId}`, body);
}

/**
 * Označí verzi jako released.
 */
export async function releaseVersion(
  versionId: string,
  releaseDate?: string,
  projectKeyHint?: string
): Promise<JiraVersion> {
  const today = new Date().toISOString().split("T")[0];

  return updateVersion(
    versionId,
    {
      released: true,
      releaseDate: releaseDate || today,
    },
    projectKeyHint
  );
}

/**
 * Archivuje verzi.
 */
export async function archiveVersion(
  versionId: string,
  projectKeyHint?: string
): Promise<JiraVersion> {
  return updateVersion(versionId, { archived: true }, projectKeyHint);
}

/**
 * Odarchivuje verzi.
 */
export async function unarchiveVersion(
  versionId: string,
  projectKeyHint?: string
): Promise<JiraVersion> {
  return updateVersion(versionId, { archived: false }, projectKeyHint);
}

/**
 * Smaže verzi.
 * @param moveFixIssuesTo - Volitelně přesunout issues s touto fixVersion na jinou verzi
 * @param moveAffectedIssuesTo - Volitelně přesunout issues s touto affectedVersion na jinou verzi
 */
export async function deleteVersion(
  versionId: string,
  options?: {
    moveFixIssuesTo?: string;
    moveAffectedIssuesTo?: string;
    projectKeyHint?: string;
  }
): Promise<void> {
  const config = options?.projectKeyHint
    ? loadConfigForProject(options.projectKeyHint)
    : loadConfig();

  let endpoint = `/version/${versionId}`;
  const params: string[] = [];

  if (options?.moveFixIssuesTo) {
    params.push(`moveFixIssuesTo=${options.moveFixIssuesTo}`);
  }
  if (options?.moveAffectedIssuesTo) {
    params.push(`moveAffectedIssuesTo=${options.moveAffectedIssuesTo}`);
  }

  if (params.length > 0) {
    endpoint += `?${params.join("&")}`;
  }

  await request<void>(config, "DELETE", endpoint);
}

/**
 * Formátuje verzi pro výstup.
 */
export function formatVersion(version: JiraVersion): string {
  const status: string[] = [];
  if (version.released) status.push("RELEASED");
  if (version.archived) status.push("ARCHIVED");

  const statusStr = status.length > 0 ? ` [${status.join(", ")}]` : "";
  const dateStr = version.releaseDate ? ` (${version.releaseDate})` : "";
  const descStr = version.description ? `\n    ${version.description}` : "";

  return `  ${version.name}${statusStr}${dateStr}${descStr}`;
}
