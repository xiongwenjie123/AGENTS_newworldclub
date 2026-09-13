// 前端统一 API 客户端（同源，带 cookie 会话）
export class ApiError extends Error {
  status: number;
  code: number;
  constructor(message: string, status: number, code: number) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { method = "GET", body, query } = options;
  let url = path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // 非 JSON（如文件导出）
    if (!res.ok) throw new ApiError(`请求失败 (${res.status})`, res.status, -1);
    return undefined as T;
  }
  if (!res.ok || json.code !== 0) {
    throw new ApiError(json.message || `请求失败 (${res.status})`, res.status, json.code);
  }
  return json.data;
}
