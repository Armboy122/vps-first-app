import type { OMSStatus, Request } from "@prisma/client";
import type { App } from "@/lib/server/api/app";
import type { PowerOutageRequestInput } from "@/lib/validations/powerOutageRequest";

const API_PREFIX = "/api/v1";

// Keep the hand-written fetch adapter tied to the server-owned Elysia route
// table without importing its runtime instance into the browser bundle.
type ElysiaV1Routes = App["~Routes"]["api"]["v1"];
type RequiredApiRoute =
  | "me"
  | "work-centers"
  | "branches"
  | "transformers"
  | "calendar"
  | "outages";
type MissingApiRoute = Exclude<RequiredApiRoute, keyof ElysiaV1Routes>;
type ApiRouteContractIsComplete = MissingApiRoute extends never ? true : never;
const apiRouteContractIsComplete: ApiRouteContractIsComplete = true;
void apiRouteContractIsComplete;
type OutageRouteTree = ElysiaV1Routes["outages"];
type MissingNestedRoute =
  | Exclude<"lookup", keyof ElysiaV1Routes["transformers"]>
  | Exclude<"import", keyof OutageRouteTree>
  | Exclude<":id", keyof OutageRouteTree>
  | Exclude<"preview-dates", keyof OutageRouteTree["import"]>
  | Exclude<"oms" | "status", keyof OutageRouteTree[":id"]>;
type NestedApiRouteContractIsComplete = MissingNestedRoute extends never ? true : never;
const nestedApiRouteContractIsComplete: NestedApiRouteContractIsComplete = true;
void nestedApiRouteContractIsComplete;

export type ApiFailure = {
  success: false;
  error: string;
  code?: string;
  validationErrors?: Array<{
    index: number;
    error: string;
    data?: unknown;
  }>;
  successCount?: 0;
  totalCount?: number;
};

export type ApiSuccess<T> = { success: true; data: T; [key: string]: unknown };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status?: number;

  constructor(
    message: string,
    code: string,
    status?: number,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

export interface CurrentUserDTO {
  id: number;
  employeeId: string;
  fullName: string;
  role: string;
  workCenterId: number | null;
  branchId: number | null;
}

export interface WorkCenterDTO {
  id: number;
  name: string;
}

export interface BranchDTO {
  id: number;
  shortName: string;
  workCenterId: number;
}

export interface TransformerDTO {
  transformerNumber: string;
  gisDetails: string;
  [key: string]: unknown;
}

export interface CalendarDateDTO {
  dateKey: string;
  type: "HOLIDAY" | "SPECIAL_WORKDAY";
  name: string;
  scope: string;
}

export interface OutageDTO {
  id: number;
  createdAt: Date;
  createdById: number;
  outageDate: Date;
  startTime: Date;
  endTime: Date;
  workCenterId: number;
  branchId: number;
  transformerNumber: string;
  gisDetails: string;
  area: string | null;
  omsStatus: OMSStatus;
  statusRequest: Request;
  statusUpdatedAt: Date | null;
  statusUpdatedById: number | null;
  createdBy: { fullName: string; employeeId?: string };
  workCenter: { name: string; id: number };
  branch: { shortName: string };
}

export interface PageDTO<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    [key: string]: unknown;
  };
}

type FetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiFailure(value: unknown): value is ApiFailure {
  return isObject(value) && value.success === false && typeof value.error === "string";
}

function httpCode(status: number): string {
  switch (status) {
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 422: return "VALIDATION_ERROR";
    default: return status >= 500 ? "SERVER_ERROR" : `HTTP_${status}`;
  }
}

/**
 * Make one same-origin request to the isolated Elysia API.
 * Mutations are deliberately never retried here: outage-import retries must
 * reuse the exact caller-owned idempotency key and payload.
 */
async function request<T>(path: string, options: FetchOptions = {}): Promise<ApiResult<T>> {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new TypeError("API paths must be same-origin absolute paths");
  }

  const method = options.method ?? "GET";
  const isMutation = method !== "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (isMutation) {
    headers["Content-Type"] = "application/json";
    headers["x-vps-client"] = "web";
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      return {
        success: false,
        error: `เซิร์ฟเวอร์ตอบกลับด้วยสถานะ ${response.status}`,
        code: httpCode(response.status),
      };
    }
    throw new ApiClientError("เซิร์ฟเวอร์ตอบกลับข้อมูลที่อ่านไม่ได้", "INVALID_RESPONSE", response.status);
  }

  if (!response.ok) {
    if (isApiFailure(payload)) return payload;
    return {
      success: false,
      error: `คำขอไม่สำเร็จ (HTTP ${response.status})`,
      code: httpCode(response.status),
    };
  }

  if (isApiFailure(payload)) return payload;
  if (!isObject(payload) || payload.success !== true) {
    throw new ApiClientError("รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง", "INVALID_RESPONSE", response.status);
  }

  return payload as ApiSuccess<T>;
}

async function getData<T>(path: string, signal?: AbortSignal): Promise<T> {
  const result = await request<T>(path, { signal });
  if (!result.success) {
    throw new ApiClientError(result.error, result.code ?? "API_ERROR");
  }
  return result.data;
}

async function mutate<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<ApiResult<T>> {
  return request<T>(path, { method, body });
}

function toDate(value: unknown, field: string): Date {
  const date = value instanceof Date ? new Date(value) : new Date(String(value));
  if (!Number.isFinite(date.getTime())) {
    throw new ApiClientError(`ข้อมูลวันที่ ${field} ไม่ถูกต้อง`, "INVALID_DATE");
  }
  return date;
}

function normalizeOutageDates(row: Omit<OutageDTO, "createdAt" | "outageDate" | "startTime" | "endTime" | "statusUpdatedAt"> & {
  createdAt: string | Date;
  outageDate: string | Date;
  startTime: string | Date;
  endTime: string | Date;
  statusUpdatedAt: string | Date | null;
}): OutageDTO {
  return {
    ...row,
    createdAt: toDate(row.createdAt, "createdAt"),
    outageDate: toDate(row.outageDate, "outageDate"),
    startTime: toDate(row.startTime, "startTime"),
    endTime: toDate(row.endTime, "endTime"),
    statusUpdatedAt: row.statusUpdatedAt === null ? null : toDate(row.statusUpdatedAt, "statusUpdatedAt"),
  };
}

type WireOutage = Omit<OutageDTO, "createdAt" | "outageDate" | "startTime" | "endTime" | "statusUpdatedAt"> & {
  createdAt: string | Date;
  outageDate: string | Date;
  startTime: string | Date;
  endTime: string | Date;
  statusUpdatedAt: string | Date | null;
};

function queryString(values: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function dateQuery(value: Date | undefined): string | undefined {
  if (!value) return undefined;
  if (!Number.isFinite(value.getTime())) throw new TypeError("Date filter must be a valid date");
  return value.toISOString().slice(0, 10);
}

export async function getCurrentUser(): Promise<CurrentUserDTO> {
  return getData<CurrentUserDTO>("/me");
}

export async function getWorkCenters(): Promise<WorkCenterDTO[]> {
  return getData<WorkCenterDTO[]>("/work-centers");
}

export async function getBranches(workCenterId: number): Promise<BranchDTO[]> {
  if (!Number.isSafeInteger(workCenterId) || workCenterId <= 0) return [];
  return getData<BranchDTO[]>(`/branches${queryString({ workCenterId })}`);
}

export async function searchTransformers(searchTerm: string): Promise<TransformerDTO[]> {
  return getData<TransformerDTO[]>(`/transformers${queryString({ search: searchTerm })}`);
}

export async function getTransformersByNumbers(numbers: string[]): Promise<TransformerDTO[]> {
  const result = await request<TransformerDTO[]>("/transformers/lookup", {
    method: "POST",
    body: { numbers },
  });
  if (!result.success) throw new ApiClientError(result.error, result.code ?? "API_ERROR");
  return result.data;
}

export async function validateOutageDatesForImport(dates: string[]): Promise<{
  success: true;
  results: Record<string, { isValid: boolean; error?: string }>;
} | ApiFailure> {
  return request("/outages/import/preview-dates", { method: "POST", body: { dates } }) as Promise<{
    success: true;
    results: Record<string, { isValid: boolean; error?: string }>;
  } | ApiFailure>;
}

export async function getActiveBusinessCalendarDateMetadata(
  startDate: string,
  endDate: string,
): Promise<CalendarDateDTO[]> {
  return getData<CalendarDateDTO[]>(`/calendar${queryString({ startDate, endDate })}`);
}

export async function getAllActiveBusinessCalendarDateMetadata(): Promise<CalendarDateDTO[]> {
  const currentYear = new Date().getFullYear();
  return getActiveBusinessCalendarDateMetadata(`${currentYear}-01-01`, `${currentYear + 5}-12-31`);
}

export async function getPowerOutageRequests(
  page = 1,
  limit = 50,
  filters?: {
    workCenterId?: number;
    omsStatus?: OMSStatus;
    statusRequest?: Request;
    startDate?: Date;
    endDate?: Date;
  },
): Promise<PageDTO<OutageDTO>> {
  const response = await request<WireOutage[]>(`/outages${queryString({
    page,
    limit,
    workCenterId: filters?.workCenterId,
    omsStatus: filters?.omsStatus,
    statusRequest: filters?.statusRequest,
    startDate: dateQuery(filters?.startDate),
    endDate: dateQuery(filters?.endDate),
  })}`);
  if (!response.success) throw new ApiClientError(response.error, response.code ?? "API_ERROR");
  const pagination = response.pagination;
  if (!Array.isArray(response.data) || !isObject(pagination)) {
    throw new ApiClientError("รูปแบบรายการคำขอจากเซิร์ฟเวอร์ไม่ถูกต้อง", "INVALID_RESPONSE");
  }
  return {
    data: response.data.map(normalizeOutageDates),
    pagination: pagination as PageDTO<OutageDTO>["pagination"],
  };
}

export async function createPowerOutageRequest(data: PowerOutageRequestInput): Promise<ApiResult<OutageDTO>> {
  const result = await mutate<WireOutage>("/outages", "POST", data);
  return result.success ? { ...result, data: normalizeOutageDates(result.data) } : result;
}

export async function createMultiplePowerOutageRequests(
  requests: PowerOutageRequestInput[],
  idempotencyKey: string,
): Promise<(ApiSuccess<OutageDTO[]> & { successCount: number; totalCount: number; message?: string }) | ApiFailure> {
  const result = await mutate<WireOutage[]>("/outages/import", "POST", { requests, idempotencyKey });
  if (!result.success) return result;
  const successCount = typeof result.successCount === "number" ? result.successCount : 0;
  const totalCount = typeof result.totalCount === "number" ? result.totalCount : requests.length;
  const message = typeof result.message === "string" ? result.message : undefined;
  return {
    ...result,
    data: result.data.map(normalizeOutageDates),
    successCount,
    totalCount,
    ...(message ? { message } : {}),
  };
}

export async function updatePowerOutageRequest(
  id: number,
  data: PowerOutageRequestInput,
): Promise<ApiResult<OutageDTO>> {
  const result = await mutate<WireOutage>(`/outages/${id}`, "PATCH", {
    outageDate: data.outageDate,
    startTime: data.startTime,
    endTime: data.endTime,
    area: data.area,
  });
  return result.success ? { ...result, data: normalizeOutageDates(result.data) } : result;
}

export async function updateOMS(id: number, omsStatus: OMSStatus): Promise<ApiResult<OutageDTO>> {
  const result = await mutate<WireOutage>(`/outages/${id}/oms`, "PATCH", { omsStatus });
  return result.success ? { ...result, data: normalizeOutageDates(result.data) } : result;
}

export async function updateStatusRequest(id: number, statusRequest: Request): Promise<ApiResult<OutageDTO>> {
  const result = await mutate<WireOutage>(`/outages/${id}/status`, "PATCH", { statusRequest });
  return result.success ? { ...result, data: normalizeOutageDates(result.data) } : result;
}

export async function deletePowerOutageRequest(id: number): Promise<(ApiSuccess<undefined> & { message: string }) | ApiFailure> {
  return mutate<undefined>(`/outages/${id}`, "DELETE") as Promise<(ApiSuccess<undefined> & { message: string }) | ApiFailure>;
}
