// Konfigurace pro jednu instanci
export interface JiraConfig {
  url: string;
  email: string;
  apiToken: string;
}

// Instance s metadaty
export interface JiraInstanceConfig extends JiraConfig {
  name: string;
  default?: boolean;
  projects?: string[];
}

/**
 * Discover named instances from env vars matching JIRA_<NAME>_URL pattern.
 * Ignores the default JIRA_URL/JIRA_EMAIL/JIRA_API_TOKEN (no underscore-separated name).
 */
function discoverNamedInstances(): JiraInstanceConfig[] {
  const instances: JiraInstanceConfig[] = [];
  const seen = new Set<string>();

  for (const key of Object.keys(process.env)) {
    const match = key.match(/^JIRA_([A-Z0-9]+)_URL$/);
    if (!match) continue;
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);

    const url = process.env[`JIRA_${name}_URL`];
    const email = process.env[`JIRA_${name}_EMAIL`];
    const apiToken = process.env[`JIRA_${name}_API_TOKEN`];
    if (!url || !email || !apiToken) continue;

    const projectsRaw = process.env[`JIRA_${name}_PROJECTS`];
    const projects = projectsRaw ? projectsRaw.split(",").map(p => p.trim()).filter(Boolean) : undefined;

    instances.push({ name: name.toLowerCase(), url, email, apiToken, projects });
  }

  return instances;
}

/**
 * Load default config from JIRA_URL / JIRA_EMAIL / JIRA_API_TOKEN env vars.
 * Falls back to first discovered named instance if default vars aren't set.
 */
export function loadConfig(): JiraConfig {
  const url = process.env.JIRA_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (url && email && apiToken) {
    return { url, email, apiToken };
  }

  // Fallback: use first named instance
  const instances = discoverNamedInstances();
  if (instances.length > 0) {
    return instances[0];
  }

  console.error("Error: Jira not configured. Set JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN environment variables.");
  process.exit(1);
}

/**
 * Load config for a named instance from JIRA_<NAME>_* env vars.
 * Falls back to default config if named instance not found.
 */
export function loadConfigByName(name: string): JiraConfig {
  const upperName = name.toUpperCase();
  const url = process.env[`JIRA_${upperName}_URL`];
  const email = process.env[`JIRA_${upperName}_EMAIL`];
  const apiToken = process.env[`JIRA_${upperName}_API_TOKEN`];

  if (url && email && apiToken) {
    return { url, email, apiToken };
  }

  console.error(`Warning: Instance "${name}" not found, using default.`);
  return loadConfig();
}

/**
 * Load config for a project (by issue key prefix).
 * Scans named instances for matching JIRA_<NAME>_PROJECTS.
 */
export function loadConfigForProject(issueKeyOrProject: string): JiraConfig {
  const projectKey = issueKeyOrProject.split("-")[0].toUpperCase();

  for (const instance of discoverNamedInstances()) {
    if (instance.projects?.map(p => p.toUpperCase()).includes(projectKey)) {
      return instance;
    }
  }

  return loadConfig();
}

/**
 * List all configured instances.
 */
export function listInstances(): JiraInstanceConfig[] {
  const instances: JiraInstanceConfig[] = [];

  // Add default instance if configured
  const url = process.env.JIRA_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  if (url && email && apiToken) {
    instances.push({ name: "default", url, email, apiToken, default: true });
  }

  // Add named instances
  instances.push(...discoverNamedInstances());

  return instances;
}

/**
 * Get browse URL for an issue.
 */
export function getBrowseUrl(issueKey: string): string {
  const config = loadConfigForProject(issueKey);
  const baseUrl = config.url.replace(/\/$/, "");
  return `${baseUrl}/browse/${issueKey}`;
}

export interface JiraIssue {
  key: string;
  id: string;
  fields: {
    summary: string;
    description: string | null;
    status: { name: string };
    assignee: { displayName: string; emailAddress: string } | null;
    reporter: { displayName: string; emailAddress: string };
    priority: { name: string } | null;
    issuetype: { name: string };
    project: { key: string; name: string };
    created: string;
    updated: string;
    labels: string[];
    components: { name: string }[];
    fixVersions: { name: string }[];
    comment?: { comments: JiraComment[] };
    attachment?: JiraAttachment[];
    issuelinks?: JiraIssueLink[];
    parent?: { key: string; fields: { summary: string } };
    subtasks?: { key: string; fields: { summary: string; status: { name: string } } }[];
    [key: string]: unknown;
  };
}

export interface JiraComment {
  id: string;
  author: { displayName: string };
  body: string;
  created: string;
  updated: string;
}

export interface JiraAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  content: string;
  created: string;
  author: { displayName: string };
}

export interface JiraIssueLink {
  id: string;
  type: { name: string; inward: string; outward: string };
  inwardIssue?: { key: string; fields: { summary: string; status: { name: string } } };
  outwardIssue?: { key: string; fields: { summary: string; status: { name: string } } };
}

export interface JiraTransition {
  id: string;
  name: string;
  to: { name: string };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
}

export interface JiraClientOptions {
  config?: JiraConfig;
  instance?: string;
  issueKey?: string;
}

export class JiraClient {
  private config_: JiraConfig;
  private baseUrl: string;
  private authHeader_: string;

  constructor(options?: JiraClientOptions | JiraConfig) {
    if (options && "url" in options && "email" in options) {
      this.config_ = options as JiraConfig;
    } else {
      const opts = options as JiraClientOptions | undefined;
      if (opts?.config) {
        this.config_ = opts.config;
      } else if (opts?.instance) {
        this.config_ = loadConfigByName(opts.instance);
      } else if (opts?.issueKey) {
        this.config_ = loadConfigForProject(opts.issueKey);
      } else {
        this.config_ = loadConfig();
      }
    }

    this.baseUrl = `${this.config_.url}/rest/api/3`;
    this.authHeader_ = `Basic ${Buffer.from(`${this.config_.email}:${this.config_.apiToken}`).toString("base64")}`;
  }

  static forIssue(issueKey: string): JiraClient {
    return new JiraClient({ issueKey });
  }

  static forInstance(name: string): JiraClient {
    return new JiraClient({ instance: name });
  }

  /** Get the config for this client instance. */
  getConfig(): JiraConfig {
    return this.config_;
  }

  /** Get the Authorization header value. */
  getAuthHeader(): string {
    return this.authHeader_;
  }

  async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    contentType = "application/json"
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: this.authHeader_,
    };

    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? (contentType === "application/json" ? JSON.stringify(body) : body as BodyInit) : undefined,
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

  // === GET ISSUE ===
  async getIssue(issueKey: string, expand = "comment,attachment"): Promise<JiraIssue> {
    return this.request<JiraIssue>("GET", `/issue/${issueKey}?expand=renderedFields,${expand}`);
  }

  // === SEARCH ===
  async search(jql: string, maxResults = 50, startAt = 0): Promise<JiraSearchResult> {
    const fields = [
      "summary", "description", "status", "assignee", "reporter",
      "priority", "issuetype", "project", "created", "updated",
      "labels", "components", "fixVersions", "parent", "subtasks", "issuelinks"
    ].join(",");

    return this.request<JiraSearchResult>(
      "GET",
      `/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=${fields}`
    );
  }

  // === CREATE ISSUE ===
  async createIssue(data: {
    project: string;
    issueType: string;
    summary: string;
    description?: string | object;
    assignee?: string;
    priority?: string;
    labels?: string[];
    parentKey?: string;
    dueDate?: string;
  }): Promise<{ key: string; id: string }> {
    const fields: Record<string, unknown> = {
      project: { key: data.project },
      issuetype: { name: data.issueType },
      summary: data.summary,
    };

    if (data.description) {
      fields.description = typeof data.description === "string"
        ? textToAdf(data.description)
        : data.description;
    }
    if (data.assignee) fields.assignee = { accountId: data.assignee };
    if (data.priority) fields.priority = { name: data.priority };
    if (data.labels) fields.labels = data.labels;
    if (data.parentKey) fields.parent = { key: data.parentKey };
    if (data.dueDate) fields.duedate = data.dueDate;

    return this.request<{ key: string; id: string }>("POST", "/issue", { fields });
  }

  // === UPDATE ISSUE ===
  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.request<void>("PUT", `/issue/${issueKey}`, { fields });
  }

  // === TRANSITIONS ===
  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    const result = await this.request<{ transitions: JiraTransition[] }>("GET", `/issue/${issueKey}/transitions`);
    return result.transitions;
  }

  async transitionIssue(issueKey: string, transitionId: string, fields?: Record<string, unknown>): Promise<void> {
    const body: Record<string, unknown> = {
      transition: { id: transitionId },
    };
    if (fields && Object.keys(fields).length > 0) {
      body.fields = fields;
    }
    await this.request<void>("POST", `/issue/${issueKey}/transitions`, body);
  }

  // === ASSIGNEE ===
  async assignIssue(issueKey: string, accountId: string | null): Promise<void> {
    await this.request<void>("PUT", `/issue/${issueKey}/assignee`, {
      accountId,
    });
  }

  // === COMMENTS ===
  async addComment(issueKey: string, body: string | object): Promise<JiraComment> {
    const adfBody = typeof body === "string" ? textToAdf(body) : body;
    return this.request<JiraComment>("POST", `/issue/${issueKey}/comment`, { body: adfBody });
  }

  async getComments(issueKey: string): Promise<JiraComment[]> {
    const result = await this.request<{ comments: JiraComment[] }>("GET", `/issue/${issueKey}/comment`);
    return result.comments;
  }

  async deleteComment(issueKey: string, commentId: string): Promise<void> {
    await this.request<void>("DELETE", `/issue/${issueKey}/comment/${commentId}`);
  }

  // === ATTACHMENTS ===
  async uploadAttachment(issueKey: string, filePath: string): Promise<JiraAttachment[]> {
    const fs = await import("fs");
    const path = await import("path");
    const filename = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
      fileContent,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const response = await fetch(`${this.baseUrl}/issue/${issueKey}/attachments`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader_,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "X-Atlassian-Token": "no-check",
      },
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed (${response.status}): ${error}`);
    }

    return response.json();
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    const url = `${this.config_.url}/rest/api/3/attachment/${attachmentId}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: this.authHeader_ },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Delete attachment failed (${response.status}): ${error}`);
    }
  }

  // === ISSUE LINKS ===
  async deleteLink(linkId: string): Promise<void> {
    const url = `${this.config_.url}/rest/api/3/issueLink/${linkId}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: this.authHeader_ },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }
  }

  async linkIssues(
    inwardIssue: string,
    outwardIssue: string,
    linkType: string
  ): Promise<void> {
    const url = `${this.config_.url}/rest/api/3/issueLink`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader_,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: { name: linkType },
        inwardIssue: { key: inwardIssue },
        outwardIssue: { key: outwardIssue },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }
  }

  // === USERS ===
  async searchUsers(query: string): Promise<{ accountId: string; displayName: string; emailAddress: string }[]> {
    const users = await this.request<{ accountId: string; displayName: string; emailAddress: string }[]>(
      "GET",
      `/user/search?query=${encodeURIComponent(query)}`
    );
    return users.filter(u => !u.accountId.startsWith("qm:"));
  }

  async getMyself(): Promise<{ accountId: string; displayName: string; emailAddress: string }> {
    return this.request<{ accountId: string; displayName: string; emailAddress: string }>("GET", "/myself");
  }

  // === PROJECTS ===
  async getProjects(): Promise<{ key: string; name: string }[]> {
    return this.request<{ key: string; name: string }[]>("GET", "/project");
  }

  // === ISSUE TYPES ===
  async getIssueTypes(projectKey: string): Promise<{ name: string; subtask: boolean }[]> {
    const project = await this.request<{ issueTypes: { name: string; subtask: boolean }[] }>(
      "GET",
      `/project/${projectKey}`
    );
    return project.issueTypes;
  }
}

// Helper pro prevod wiki markup na ADF
export function textToAdf(text: string): object {
  const lines = text.split("\n");
  const content: object[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule: ---
    if (line.trim() === "---") {
      content.push({ type: "rule" });
      i++;
      continue;
    }

    // Jira-style headings: h1. H1, h2. H2, h3. H3
    const jiraHeadingMatch = line.match(/^h([1-6])\.\s+(.+)$/);
    if (jiraHeadingMatch) {
      const level = parseInt(jiraHeadingMatch[1], 10);
      content.push({
        type: "heading",
        attrs: { level },
        content: parseInlineMarkup(jiraHeadingMatch[2]),
      });
      i++;
      continue;
    }

    // Code block: {code:lang}...{code} or {code}...{code}
    const codeBlockMatch = line.match(/^\{code(?::(\w+))?\}$/);
    if (codeBlockMatch) {
      const language = codeBlockMatch[1] || "plain";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^\{code\}$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing {code}
      content.push({
        type: "codeBlock",
        attrs: { language },
        content: codeLines.length > 0 ? [{ type: "text", text: codeLines.join("\n") }] : [],
      });
      continue;
    }

    // Panel: {panel:title=X}...{panel}
    const panelMatch = line.match(/^\{panel(?::title=([^}]+))?\}$/);
    if (panelMatch) {
      const title = panelMatch[1];
      const panelLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^\{panel\}$/)) {
        panelLines.push(lines[i]);
        i++;
      }
      i++; // skip closing {panel}
      const panelContent: object[] = [];
      if (title) {
        panelContent.push({
          type: "paragraph",
          content: [{ type: "text", text: title, marks: [{ type: "strong" }] }],
        });
      }
      for (const panelLine of panelLines) {
        if (panelLine.trim()) {
          panelContent.push({
            type: "paragraph",
            content: parseInlineMarkup(panelLine),
          });
        }
      }
      content.push({
        type: "panel",
        attrs: { panelType: "info" },
        content: panelContent,
      });
      continue;
    }

    // Table: ||header||header|| for header, |cell|cell| for rows
    if (line.match(/^\|\|.+\|\|$/) || line.match(/^\|[^|].+\|$/)) {
      const tableRows: object[] = [];

      while (i < lines.length && (lines[i].match(/^\|\|.+\|\|$/) || lines[i].match(/^\|[^|].+\|$/))) {
        const currentLine = lines[i];
        const isHeader = currentLine.startsWith("||");

        let cells: string[];
        if (isHeader) {
          cells = currentLine.slice(2, -2).split("||");
        } else {
          cells = currentLine.slice(1, -1).split("|");
        }

        const cellType = isHeader ? "tableHeader" : "tableCell";
        const rowContent = cells.map((cell) => ({
          type: cellType,
          attrs: {},
          content: [
            {
              type: "paragraph",
              content: parseInlineMarkup(cell.trim()),
            },
          ],
        }));

        tableRows.push({
          type: "tableRow",
          content: rowContent,
        });
        i++;
      }

      content.push({
        type: "table",
        attrs: { isNumberColumnEnabled: false, layout: "default" },
        content: tableRows,
      });
      continue;
    }

    // Quote block: {quote}...{quote}
    if (line.trim() === "{quote}") {
      const quoteLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "{quote}") {
        quoteLines.push(lines[i]);
        i++;
      }
      i++; // skip closing {quote}
      content.push({
        type: "blockquote",
        content: quoteLines.map((l) => ({
          type: "paragraph",
          content: parseInlineMarkup(l),
        })),
      });
      continue;
    }

    // Numbered list: # item or 1. item
    if (line.match(/^(#|\d+\.)\s+/)) {
      const listItems: object[] = [];
      while (i < lines.length && lines[i].match(/^(#|\d+\.)\s+/)) {
        const itemText = lines[i].replace(/^(#|\d+\.)\s+/, "");
        listItems.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineMarkup(itemText),
            },
          ],
        });
        i++;
      }
      content.push({ type: "orderedList", content: listItems });
      continue;
    }

    // Bullet list: - item or * item (at start of line, not bold)
    if (line.match(/^[-*]\s+/)) {
      const listItems: object[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        const itemText = lines[i].replace(/^[-*]\s+/, "");
        listItems.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineMarkup(itemText),
            },
          ],
        });
        i++;
      }
      content.push({ type: "bulletList", content: listItems });
      continue;
    }

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph
    content.push({
      type: "paragraph",
      content: parseInlineMarkup(line),
    });
    i++;
  }

  return { version: 1, type: "doc", content };
}

// Parse inline markup: *bold*, _italic_, {{code}}, [text|url]
function parseInlineMarkup(text: string): object[] {
  if (!text) return [];

  const result: object[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Inline code: {{code}}
    const codeMatch = remaining.match(/^\{\{([^}]+)\}\}/);
    if (codeMatch) {
      result.push({
        type: "text",
        text: codeMatch[1],
        marks: [{ type: "code" }],
      });
      remaining = remaining.substring(codeMatch[0].length);
      continue;
    }

    // Wiki link: [text|url]
    const linkMatch = remaining.match(/^\[([^\]|]+)\|([^\]]+)\]/);
    if (linkMatch) {
      result.push({
        type: "text",
        text: linkMatch[1],
        marks: [{ type: "link", attrs: { href: linkMatch[2] } }],
      });
      remaining = remaining.substring(linkMatch[0].length);
      continue;
    }

    // Bold: *text*
    const boldMatch = remaining.match(/^\*([^*]+)\*/);
    if (boldMatch) {
      result.push({
        type: "text",
        text: boldMatch[1],
        marks: [{ type: "strong" }],
      });
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    // Italic: _text_
    const italicMatch = remaining.match(/^_([^_]+)_/);
    if (italicMatch) {
      result.push({
        type: "text",
        text: italicMatch[1],
        marks: [{ type: "em" }],
      });
      remaining = remaining.substring(italicMatch[0].length);
      continue;
    }

    // Plain URL (standalone)
    const urlMatch = remaining.match(/^(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      result.push({
        type: "text",
        text: urlMatch[1],
        marks: [{ type: "link", attrs: { href: urlMatch[1] } }],
      });
      remaining = remaining.substring(urlMatch[0].length);
      continue;
    }

    // Plain text until next special char or end
    const plainMatch = remaining.match(/^[^*_\[\]{h]+/) || remaining.match(/^./);
    if (plainMatch) {
      result.push({ type: "text", text: plainMatch[0] });
      remaining = remaining.substring(plainMatch[0].length);
    }
  }

  return result;
}

// Helper pro prevod ADF na plain text
function adfToText(adf: unknown): string {
  if (!adf || typeof adf !== "object") return String(adf || "");

  const doc = adf as { content?: unknown[] };
  if (!doc.content) return "";

  function extractText(nodes: unknown[]): string {
    return nodes
      .map((node) => {
        const n = node as { type?: string; text?: string; content?: unknown[] };
        if (n.type === "text") return n.text || "";
        if (n.type === "hardBreak") return "\n";
        if (n.type === "paragraph") return extractText(n.content || []) + "\n";
        if (n.type === "bulletList" || n.type === "orderedList") {
          return (n.content || [])
            .map((item, i) => {
              const li = item as { content?: unknown[] };
              const prefix = n.type === "orderedList" ? `${i + 1}. ` : "- ";
              return prefix + extractText(li.content || []);
            })
            .join("");
        }
        if (n.type === "listItem") return extractText(n.content || []);
        if (n.type === "heading") return extractText(n.content || []) + "\n";
        if (n.type === "codeBlock") return "```\n" + extractText(n.content || []) + "```\n";
        if (n.type === "blockquote") return "> " + extractText(n.content || []);
        if (n.type === "mention") return "@" + ((node as { attrs?: { text?: string } }).attrs?.text || "user");
        if (n.type === "inlineCard" || n.type === "blockCard") {
          return (node as { attrs?: { url?: string } }).attrs?.url || "[link]";
        }
        if (n.content) return extractText(n.content);
        return "";
      })
      .join("");
  }

  return extractText(doc.content).trim();
}

// Helper pro formatovani vystupu
export function formatIssue(issue: JiraIssue, includeComments = false, includeAttachments = false): string {
  const lines: string[] = [];

  lines.push(`=== ${issue.key}: ${issue.fields.summary} ===`);
  lines.push(``);
  lines.push(`Status:     ${issue.fields.status.name}`);
  lines.push(`Type:       ${issue.fields.issuetype.name}`);
  lines.push(`Project:    ${issue.fields.project.name} (${issue.fields.project.key})`);
  lines.push(`Priority:   ${issue.fields.priority?.name || "None"}`);
  lines.push(`Assignee:   ${issue.fields.assignee?.displayName || "Unassigned"}`);
  lines.push(`Reporter:   ${issue.fields.reporter.displayName}`);
  lines.push(`Created:    ${new Date(issue.fields.created).toLocaleString()}`);
  lines.push(`Updated:    ${new Date(issue.fields.updated).toLocaleString()}`);

  if (issue.fields.labels.length > 0) {
    lines.push(`Labels:     ${issue.fields.labels.join(", ")}`);
  }

  if (issue.fields.parent) {
    lines.push(`Parent:     ${issue.fields.parent.key} - ${issue.fields.parent.fields.summary}`);
  }

  if (issue.fields.description) {
    lines.push(``);
    lines.push(`--- Description ---`);
    lines.push(adfToText(issue.fields.description));
  }

  if (issue.fields.issuelinks && issue.fields.issuelinks.length > 0) {
    lines.push(``);
    lines.push(`--- Related Issues ---`);
    for (const link of issue.fields.issuelinks) {
      if (link.inwardIssue) {
        lines.push(`  ${link.type.inward}: ${link.inwardIssue.key} - ${link.inwardIssue.fields.summary}`);
      }
      if (link.outwardIssue) {
        lines.push(`  ${link.type.outward}: ${link.outwardIssue.key} - ${link.outwardIssue.fields.summary}`);
      }
    }
  }

  if (issue.fields.subtasks && issue.fields.subtasks.length > 0) {
    lines.push(``);
    lines.push(`--- Subtasks ---`);
    for (const subtask of issue.fields.subtasks) {
      lines.push(`  ${subtask.key}: ${subtask.fields.summary} [${subtask.fields.status.name}]`);
    }
  }

  if (includeAttachments && issue.fields.attachment && issue.fields.attachment.length > 0) {
    lines.push(``);
    lines.push(`--- Attachments ---`);
    for (const att of issue.fields.attachment) {
      lines.push(`  ${att.filename} (${(att.size / 1024).toFixed(1)} KB) - ${att.content}`);
    }
  }

  if (includeComments && issue.fields.comment?.comments && issue.fields.comment.comments.length > 0) {
    lines.push(``);
    lines.push(`--- Comments (${issue.fields.comment.comments.length}) ---`);
    for (const comment of issue.fields.comment.comments) {
      lines.push(``);
      lines.push(`[${new Date(comment.created).toLocaleString()}] ${comment.author.displayName}:`);
      lines.push(adfToText(comment.body));
    }
  }

  return lines.join("\n");
}
