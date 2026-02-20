import fs from "fs";
import path from "path";
import os from "os";

const CREDENTIALS_PATH = path.join(os.homedir(), ".gimmedata", "raynet.json");
const BASE_URL = "https://app.raynet.cz/api/v2";

// === DATE HELPERS ===

/**
 * Konvertuje datum do formátu požadovaného Raynet API (yyyy-MM-dd HH:mm)
 * Pokud je zadáno pouze datum (yyyy-MM-dd), přidá čas 00:00.
 */
export function formatDateForApi(date: string): string {
  // Pokud už obsahuje čas, vrať jak je
  if (date.includes(" ") || date.includes("T")) {
    return date.replace("T", " ").substring(0, 16);
  }
  // Přidej čas 00:00
  return `${date} 00:00`;
}

/**
 * Konvertuje datum na konec dne (23:59) pro "before" filtry
 */
export function formatDateEndOfDay(date: string): string {
  const baseDate = date.split(" ")[0].split("T")[0];
  return `${baseDate} 23:59`;
}

// === CREDENTIALS ===

export interface RaynetCredentials {
  instanceName: string;
  username: string;
  apiKey: string;
}

export interface RaynetInstanceConfig extends RaynetCredentials {
  name: string;
  default?: boolean;
}

export interface RaynetMultiConfig {
  instances: RaynetInstanceConfig[];
}

type RaynetConfigFile = RaynetCredentials | RaynetMultiConfig;

function isMultiConfig(config: RaynetConfigFile): config is RaynetMultiConfig {
  return "instances" in config && Array.isArray(config.instances);
}

function loadFromEnv(): RaynetCredentials | null {
  const instanceName = process.env.RAYNET_INSTANCE;
  const username = process.env.RAYNET_API_USER;
  const apiKey = process.env.RAYNET_API_TOKEN;
  if (instanceName && username && apiKey) {
    return { instanceName, username, apiKey };
  }
  return null;
}

function loadRawConfig(): RaynetConfigFile {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(
      `Chyba: Credentials nenalezeny. Nastav env proměnné RAYNET_INSTANCE, RAYNET_API_USER, RAYNET_API_TOKEN nebo vytvoř soubor ${CREDENTIALS_PATH}`
    );
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
}

/**
 * Načte výchozí konfiguraci.
 * Priorita: 1) env vars, 2) credentials soubor
 */
export function loadConfig(): RaynetCredentials {
  // Preferuj env vars
  const envConfig = loadFromEnv();
  if (envConfig) return envConfig;

  const raw = loadRawConfig();

  if (isMultiConfig(raw)) {
    const defaultInstance = raw.instances.find((i) => i.default) || raw.instances[0];
    if (!defaultInstance) {
      console.error("Chyba: Konfigurace neobsahuje žádné instance.");
      process.exit(1);
    }
    return defaultInstance;
  }

  return raw;
}

/**
 * Načte konfiguraci podle názvu instance.
 * Pokud instance není nalezena, vrátí výchozí.
 */
export function loadConfigByName(name: string): RaynetCredentials {
  const raw = loadRawConfig();

  if (isMultiConfig(raw)) {
    const instance = raw.instances.find((i) => i.name === name);
    if (instance) return instance;
    console.error(`Varování: Instance "${name}" nenalezena, používám výchozí.`);
  }

  return loadConfig();
}

/**
 * Vrátí seznam všech nakonfigurovaných instancí.
 */
export function listInstances(): RaynetInstanceConfig[] {
  const raw = loadRawConfig();

  if (isMultiConfig(raw)) {
    return raw.instances;
  }

  // Starý formát - vrátíme jako jednu "default" instanci
  return [
    {
      ...raw,
      name: raw.instanceName,
      default: true,
    },
  ];
}

// === TYPES ===

export interface Company {
  id: number;
  name: string;
  regNumber?: string;
  taxNumber?: string;
  rating?: string;
  state?: string;
  role?: string;
  owner?: { id: number; fullName: string };
  category?: { id: number; value: string };
  contactInfo?: {
    email?: string;
    email2?: string;
    tel1?: string;
    tel2?: string;
    www?: string;
  };
  address?: {
    street?: string;
    city?: string;
    zipCode?: string;
    country?: string;
  };
  notice?: string;
  rowInfo?: {
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface Person {
  id: number;
  titleBefore?: string;
  firstName?: string;
  lastName: string;
  titleAfter?: string;
  owner?: { id: number; fullName: string };
  category?: { id: number; value: string };
  contactInfo?: {
    email?: string;
    email2?: string;
    tel1?: string;
    tel2?: string;
  };
  primaryRelationship?: {
    company?: { id: number; name: string };
    position?: string;
  };
  notice?: string;
  rowInfo?: {
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface Activity {
  id: number;
  title: string;
  priority?: string;
  status?: string;
  category?: { id: number; value: string };
  owner?: { id: number; fullName: string };
  company?: { id: number; name: string };
  person?: { id: number; fullName: string };
  scheduledFrom?: string;
  scheduledTill?: string;
  completed?: string;
  description?: string;
  rowInfo?: {
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface Task {
  id: number;
  title: string;
  priority?: string;
  status?: string;
  category?: { id: number; value: string };
  owner?: { id: number; fullName: string };
  company?: { id: number; name: string };
  person?: { id: number; fullName: string };
  deadline?: string;
  completed?: string;
  description?: string;
  rowInfo?: {
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface BusinessCase {
  id: number;
  name: string;
  code?: string;
  totalAmount?: number;
  currency?: { id: number; value: string };
  businessCasePhase?: { id: number; value: string };
  owner?: { id: number; fullName: string };
  company?: { id: number; name: string };
  person?: { id: number; fullName: string };
  scheduledEnd?: string;
  validFrom?: string;
  validTill?: string;
  description?: string;
  rowInfo?: {
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface Lead {
  id: number;
  topic: string;
  priority?: string;
  leadPhase?: { id: number; value: string };
  owner?: { id: number; fullName: string };
  companyName?: string;
  contactInfo?: {
    email?: string;
    tel1?: string;
  };
  notice?: string;
  rowInfo?: {
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface SearchResult<T> {
  success: string;
  totalCount: number;
  data: T[];
}

export interface CreateActivityRequest {
  title: string;
  category?: number;
  owner?: number;
  company?: number;
  person?: number;
  scheduledFrom?: string;
  scheduledTill?: string;
  description?: string;
  priority?: "DEFAULT" | "HIGH" | "HIGHEST";
}

export interface CreateTaskRequest {
  title: string;
  category?: number;
  owner?: number;
  company?: number;
  person?: number;
  deadline?: string;
  description?: string;
  priority?: "DEFAULT" | "HIGH" | "HIGHEST";
}

export interface CreateCompanyRequest {
  name: string;
  owner?: number;
  rating?: string;
  state?: string;
  role?: string;
  category?: number;
  contactSource?: number;
  regNumber?: string;
  taxNumber?: string;
  notice?: string;
  contactInfo?: {
    email?: string;
    email2?: string;
    tel1?: string;
    tel2?: string;
    www?: string;
  };
  addresses?: Array<{
    address?: {
      street?: string;
      city?: string;
      zipCode?: string;
      country?: string;
    };
    primary?: boolean;
    territory?: number;
    contactAddress?: boolean;
  }>;
}

export interface UpdateCompanyRequest {
  name?: string;
  owner?: number;
  rating?: string;
  state?: string;
  role?: string;
  category?: number;
  contactSource?: number;
  regNumber?: string;
  taxNumber?: string;
  notice?: string;
  contactInfo?: {
    email?: string;
    email2?: string;
    tel1?: string;
    tel2?: string;
    www?: string;
  };
  addresses?: Array<{
    address?: {
      street?: string;
      city?: string;
      zipCode?: string;
      country?: string;
    };
    primary?: boolean;
    territory?: number;
    contactAddress?: boolean;
  }>;
}

export interface CreateBusinessCaseRequest {
  name: string;
  company?: number;
  person?: number;
  owner?: number;
  businessCasePhase?: number;
  category?: number;
  source?: number;
  totalAmount?: number;
  currency?: number;
  scheduledEnd?: string;
  validFrom?: string;
  validTill?: string;
  description?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateBusinessCaseRequest {
  name?: string;
  company?: number;
  person?: number;
  owner?: number;
  businessCasePhase?: number;
  category?: number;
  source?: number;
  totalAmount?: number;
  currency?: number;
  scheduledEnd?: string;
  validFrom?: string;
  validTill?: string;
  description?: string;
  customFields?: Record<string, unknown>;
}

export interface CreateLeadRequest {
  topic: string;
  owner?: number;
  leadPhase?: number;
  priority?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  notice?: string;
  contactInfo?: {
    email?: string;
    tel1?: string;
  };
}

export interface UpdateLeadRequest {
  topic?: string;
  owner?: number;
  leadPhase?: number;
  priority?: string;
  companyName?: string;
  titleBefore?: string;
  firstName?: string;
  lastName?: string;
  titleAfter?: string;
  notice?: string;
  contactInfo?: {
    email?: string;
    tel1?: string;
  };
}

export interface UpdatePersonRequest {
  titleBefore?: string;
  firstName?: string;
  lastName?: string;
  titleAfter?: string;
  owner?: number;
  category?: number;
  notice?: string;
  contactInfo?: {
    email?: string;
    email2?: string;
    tel1?: string;
    tel2?: string;
  };
}

// === SEARCH OPTIONS ===

export type SortDirection = "ASC" | "DESC";

export type CompanySortColumn =
  | "id"
  | "name"
  | "lastName"
  | "regNumber"
  | "rating"
  | "state"
  | "role"
  | "rowInfo.createdAt"
  | "rowInfo.updatedAt";

export type PersonSortColumn =
  | "id"
  | "firstName"
  | "lastName"
  | "rowInfo.createdAt"
  | "rowInfo.updatedAt";

export type FilterOperator = "EQ" | "NE" | "LIKE" | "LIKE_NOCASE" | "GT" | "GE" | "LT" | "LE" | "IN";

export interface SearchFilter {
  field: string;
  value: string | number | string[] | number[];
  operator?: FilterOperator;
}

export interface CompanySearchOptions {
  fulltext?: string;
  limit?: number;
  offset?: number;
  sortColumn?: CompanySortColumn;
  sortDirection?: SortDirection;
  filters?: SearchFilter[];
  // Shortcut filters
  name?: string;
  regNumber?: string;
  owner?: number;
  rating?: string;
  state?: string;
  role?: string;
  category?: number;
  tags?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

export interface PersonSearchOptions {
  fulltext?: string;
  limit?: number;
  offset?: number;
  sortColumn?: PersonSortColumn;
  sortDirection?: SortDirection;
  filters?: SearchFilter[];
  // Shortcut filters
  firstName?: string;
  lastName?: string;
  owner?: number;
  category?: number;
  tags?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

export type LeadSortColumn =
  | "id"
  | "topic"
  | "priority"
  | "rowInfo.createdAt"
  | "rowInfo.updatedAt";

export interface LeadSearchOptions {
  fulltext?: string;
  limit?: number;
  offset?: number;
  sortColumn?: LeadSortColumn;
  sortDirection?: SortDirection;
  filters?: SearchFilter[];
  // Shortcut filters
  owner?: number;
  leadPhase?: number;
  contactSource?: number;
  tags?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

export type BusinessCaseSortColumn =
  | "id"
  | "name"
  | "totalAmount"
  | "scheduledEnd"
  | "rowInfo.createdAt"
  | "rowInfo.updatedAt";

export interface BusinessCaseSearchOptions {
  fulltext?: string;
  limit?: number;
  offset?: number;
  sortColumn?: BusinessCaseSortColumn;
  sortDirection?: SortDirection;
  filters?: SearchFilter[];
  // Shortcut filters
  owner?: number;
  businessCasePhase?: number;
  company?: number;
  category?: number;
  tags?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  scheduledEndAfter?: string;
  scheduledEndBefore?: string;
}

export interface RaynetClientOptions {
  config?: RaynetCredentials;
  instance?: string;
}

// === CLIENT ===

export class RaynetClient {
  private credentials: RaynetCredentials;
  private authHeader: string;

  constructor(options?: RaynetClientOptions | RaynetCredentials) {
    // Zpětná kompatibilita - pokud je předán přímo RaynetCredentials
    if (options && "instanceName" in options && "username" in options && "apiKey" in options) {
      this.credentials = options as RaynetCredentials;
    } else {
      const opts = options as RaynetClientOptions | undefined;
      if (opts?.config) {
        this.credentials = opts.config;
      } else if (opts?.instance) {
        this.credentials = loadConfigByName(opts.instance);
      } else {
        this.credentials = loadConfig();
      }
    }

    this.authHeader = `Basic ${Buffer.from(
      `${this.credentials.username}:${this.credentials.apiKey}`
    ).toString("base64")}`;
  }

  static create(credentials?: RaynetCredentials): RaynetClient {
    return new RaynetClient(credentials ? { config: credentials } : undefined);
  }

  static createFromCredentialsFile(): RaynetClient {
    return new RaynetClient();
  }

  static forInstance(name: string): RaynetClient {
    return new RaynetClient({ instance: name });
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader,
        "X-Instance-Name": this.credentials.instanceName,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new RaynetError(response.status, `Raynet API error (${response.status}): ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // === COMPANIES ===

  /**
   * Vyhledání firem s pokročilými možnostmi řazení a filtrování.
   *
   * @param queryOrOptions - Fulltextový dotaz nebo objekt s možnostmi
   * @param limit - Limit výsledků (pouze pokud je první argument string)
   */
  async searchCompanies(
    queryOrOptions: string | CompanySearchOptions,
    limit?: number
  ): Promise<SearchResult<Company>> {
    const options: CompanySearchOptions =
      typeof queryOrOptions === "string"
        ? { fulltext: queryOrOptions, limit: limit ?? 20 }
        : queryOrOptions;

    const params = this.buildSearchParams(options, [
      "name",
      "regNumber",
      "owner",
      "rating",
      "state",
      "role",
      "category",
      "tags",
    ]);

    return this.request<SearchResult<Company>>("GET", `/company/?${params.toString()}`);
  }

  /**
   * Sestaví URLSearchParams z možností vyhledávání.
   */
  private buildSearchParams(
    options: CompanySearchOptions | PersonSearchOptions,
    shortcutFields: string[]
  ): URLSearchParams {
    const params = new URLSearchParams();

    // Základní parametry
    if (options.fulltext) params.set("fulltext", options.fulltext);
    params.set("limit", (options.limit ?? 20).toString());
    if (options.offset) params.set("offset", options.offset.toString());

    // Řazení
    if (options.sortColumn) params.set("sortColumn", options.sortColumn);
    if (options.sortDirection) params.set("sortDirection", options.sortDirection);

    // Shortcut filtry
    for (const field of shortcutFields) {
      const value = (options as Record<string, unknown>)[field];
      if (value !== undefined) {
        params.set(field, String(value));
      }
    }

    // Datumové filtry - Raynet API vyžaduje formát "yyyy-MM-dd HH:mm"
    if ("createdAfter" in options && options.createdAfter) {
      params.set("rowInfo.createdAt[GT]", formatDateForApi(options.createdAfter));
    }
    if ("createdBefore" in options && options.createdBefore) {
      params.set("rowInfo.createdAt[LT]", formatDateEndOfDay(options.createdBefore));
    }
    if ("updatedAfter" in options && options.updatedAfter) {
      params.set("rowInfo.updatedAt[GT]", formatDateForApi(options.updatedAfter));
    }
    if ("updatedBefore" in options && options.updatedBefore) {
      params.set("rowInfo.updatedAt[LT]", formatDateEndOfDay(options.updatedBefore));
    }

    // Vlastní filtry
    if (options.filters) {
      for (const filter of options.filters) {
        const operator = filter.operator ?? "EQ";
        const key = operator === "EQ" ? filter.field : `${filter.field}[${operator}]`;
        const value = Array.isArray(filter.value) ? filter.value.join(",") : String(filter.value);
        params.set(key, value);
      }
    }

    return params;
  }

  async getCompany(id: number): Promise<Company> {
    const result = await this.request<{ data: Company }>("GET", `/company/${id}/`);
    return result.data;
  }

  // === PERSONS ===

  /**
   * Vyhledání kontaktů s pokročilými možnostmi řazení a filtrování.
   *
   * @param queryOrOptions - Fulltextový dotaz nebo objekt s možnostmi
   * @param limit - Limit výsledků (pouze pokud je první argument string)
   */
  async searchPersons(
    queryOrOptions: string | PersonSearchOptions,
    limit?: number
  ): Promise<SearchResult<Person>> {
    const options: PersonSearchOptions =
      typeof queryOrOptions === "string"
        ? { fulltext: queryOrOptions, limit: limit ?? 20 }
        : queryOrOptions;

    const params = this.buildSearchParams(options, [
      "firstName",
      "lastName",
      "owner",
      "category",
      "tags",
    ]);

    return this.request<SearchResult<Person>>("GET", `/person/?${params.toString()}`);
  }

  async getPerson(id: number): Promise<Person> {
    const result = await this.request<{ data: Person }>("GET", `/person/${id}/`);
    return result.data;
  }

  // === ACTIVITIES ===

  async listActivities(filters?: {
    companyId?: number;
    personId?: number;
    ownerId?: number;
    status?: string;
    limit?: number;
  }): Promise<SearchResult<Activity>> {
    const params = new URLSearchParams();
    if (filters?.companyId) params.set("company", filters.companyId.toString());
    if (filters?.personId) params.set("person", filters.personId.toString());
    if (filters?.ownerId) params.set("owner", filters.ownerId.toString());
    if (filters?.status) params.set("status", filters.status);
    params.set("limit", (filters?.limit || 50).toString());

    return this.request<SearchResult<Activity>>("GET", `/activity/?${params.toString()}`);
  }

  async createActivity(data: CreateActivityRequest): Promise<{ id: number }> {
    return this.request<{ id: number }>("POST", "/activity/", data);
  }

  // === TASKS ===

  async listTasks(filters?: {
    companyId?: number;
    personId?: number;
    ownerId?: number;
    status?: string;
    limit?: number;
  }): Promise<SearchResult<Task>> {
    const params = new URLSearchParams();
    if (filters?.companyId) params.set("company", filters.companyId.toString());
    if (filters?.personId) params.set("person", filters.personId.toString());
    if (filters?.ownerId) params.set("owner", filters.ownerId.toString());
    if (filters?.status) params.set("status", filters.status);
    params.set("limit", (filters?.limit || 50).toString());

    return this.request<SearchResult<Task>>("GET", `/task/?${params.toString()}`);
  }

  async createTask(data: CreateTaskRequest): Promise<{ id: number }> {
    return this.request<{ id: number }>("POST", "/task/", data);
  }

  // === BUSINESS CASES ===

  /**
   * Vyhledání obchodních případů s pokročilými možnostmi řazení a filtrování.
   */
  async searchBusinessCases(
    queryOrOptions: string | BusinessCaseSearchOptions,
    limit?: number
  ): Promise<SearchResult<BusinessCase>> {
    const options: BusinessCaseSearchOptions =
      typeof queryOrOptions === "string"
        ? { fulltext: queryOrOptions, limit: limit ?? 20 }
        : queryOrOptions;

    const params = this.buildSearchParams(options, [
      "owner",
      "businessCasePhase",
      "company",
      "category",
      "tags",
    ]);

    // scheduledEnd filtry pro BusinessCase
    if ("scheduledEndAfter" in options && options.scheduledEndAfter) {
      params.set("scheduledEnd[GE]", options.scheduledEndAfter);
    }
    if ("scheduledEndBefore" in options && options.scheduledEndBefore) {
      params.set("scheduledEnd[LE]", options.scheduledEndBefore);
    }

    return this.request<SearchResult<BusinessCase>>("GET", `/businessCase/?${params.toString()}`);
  }

  async getBusinessCase(id: number): Promise<BusinessCase> {
    const result = await this.request<{ data: BusinessCase }>("GET", `/businessCase/${id}/`);
    return result.data;
  }

  // === LEADS ===

  /**
   * Vyhledání leadů s pokročilými možnostmi řazení a filtrování.
   */
  async searchLeads(
    queryOrOptions: string | LeadSearchOptions,
    limit?: number
  ): Promise<SearchResult<Lead>> {
    const options: LeadSearchOptions =
      typeof queryOrOptions === "string"
        ? { fulltext: queryOrOptions, limit: limit ?? 20 }
        : queryOrOptions;

    const params = this.buildSearchParams(options, ["owner", "leadPhase", "contactSource", "tags"]);

    return this.request<SearchResult<Lead>>("GET", `/lead/?${params.toString()}`);
  }

  async getLead(id: number): Promise<Lead> {
    const result = await this.request<{ data: Lead }>("GET", `/lead/${id}/`);
    return result.data;
  }

  // === USERS/OWNERS ===

  /**
   * Načte seznam uživatelů (vlastníků) z Raynetu.
   * Užitečné pro mapování jmen na ID.
   */
  async listUsers(): Promise<
    SearchResult<{
      id: number;
      username: string;
      person: { id: number; fullName: string };
      userRole: string;
    }>
  > {
    return this.request("GET", "/userAccount/?limit=100");
  }

  /**
   * Najde ID vlastníka (person.id) podle jména.
   * Hledá v Raynet uživatelích.
   */
  async findOwnerId(nameOrInitials: string): Promise<number | null> {
    const users = await this.listUsers();
    const searchLower = nameOrInitials.toLowerCase();

    for (const user of users.data) {
      const fullName = user.person?.fullName;
      if (!fullName) continue;

      // Přesná shoda jména
      if (fullName.toLowerCase() === searchLower) {
        return user.person.id;
      }
      // Částečná shoda
      if (fullName.toLowerCase().includes(searchLower)) {
        return user.person.id;
      }
    }

    return null;
  }

  // === COMPANIES - CREATE/UPDATE ===

  async createCompany(data: CreateCompanyRequest): Promise<{ id: number }> {
    const result = await this.request<{ data: { id: number } }>("PUT", "/company/", data);
    return result.data;
  }

  async updateCompany(id: number, data: UpdateCompanyRequest): Promise<void> {
    await this.request<void>("POST", `/company/${id}/`, data);
  }

  // === BUSINESS CASES - CREATE/UPDATE ===

  async createBusinessCase(data: CreateBusinessCaseRequest): Promise<{ id: number }> {
    const result = await this.request<{ data: { id: number } }>("PUT", "/businessCase/", data);
    return result.data;
  }

  async updateBusinessCase(id: number, data: UpdateBusinessCaseRequest): Promise<void> {
    await this.request<void>("POST", `/businessCase/${id}/`, data);
  }

  // === LEADS - CREATE/UPDATE ===

  async createLead(data: CreateLeadRequest): Promise<{ id: number }> {
    const result = await this.request<{ data: { id: number } }>("PUT", "/lead/", data);
    return result.data;
  }

  async updateLead(id: number, data: UpdateLeadRequest): Promise<void> {
    await this.request<void>("POST", `/lead/${id}/`, data);
  }

  // === LEAD TAGS ===

  /**
   * Přidá tag k leadu.
   * @param leadId ID leadu
   * @param tag Název tagu
   */
  async addLeadTag(leadId: number, tag: string): Promise<void> {
    await this.request<void>("PUT", `/lead/${leadId}/tag/`, { tag });
  }

  /**
   * Odebere tag z leadu.
   * @param leadId ID leadu
   * @param tag Název tagu
   */
  async removeLeadTag(leadId: number, tag: string): Promise<void> {
    await this.request<void>("DELETE", `/lead/${leadId}/tag/`, { tag });
  }

  /**
   * Nastaví tagy na leadu (přidá chybějící, odebere přebytečné).
   * @param leadId ID leadu
   * @param tags Seznam tagů
   * @param currentTags Aktuální tagy (pokud známe, ušetří API volání)
   */
  async setLeadTags(leadId: number, tags: string[], currentTags?: string[]): Promise<void> {
    // Pokud nemáme aktuální tagy, musíme je načíst
    let existing = currentTags;
    if (!existing) {
      const lead = await this.getLead(leadId);
      existing = lead.tags?.map((t) => t.tag) || [];
    }

    // Přidat chybějící
    for (const tag of tags) {
      if (!existing.includes(tag)) {
        await this.addLeadTag(leadId, tag);
      }
    }

    // Odebrat přebytečné
    for (const tag of existing) {
      if (!tags.includes(tag)) {
        await this.removeLeadTag(leadId, tag);
      }
    }
  }

  // === PERSONS - UPDATE ===

  async updatePerson(id: number, data: UpdatePersonRequest): Promise<void> {
    await this.request<void>("POST", `/person/${id}/`, data);
  }

  // === GENERIC API ACCESS ===

  /**
   * Přímé volání Raynet API pro entity, které nemají dedikovaný skript.
   * Užitečné pro čtení entit jako offer, product, project, atd.
   *
   * @param method HTTP metoda (GET, POST, PUT, DELETE)
   * @param endpoint API endpoint (např. "/offer/", "/product/123/")
   * @param body Tělo požadavku (pro POST/PUT)
   */
  async apiRequest<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(method, endpoint, body);
  }
}

// === ERROR ===

export class RaynetError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "RaynetError";
  }
}
