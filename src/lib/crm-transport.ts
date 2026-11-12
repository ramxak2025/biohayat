import { createHash, timingSafeEqual } from "node:crypto";

// Server-only credentials are read at delivery time, never included in snapshots.
export type CrmEvent = {
  schemaVersion: 1;
  kind: "retail_order" | "wholesale_order" | "consultation" | "inquiry";
  externalId: string;
  occurredAt: string;
  channel: "web" | "api_v1" | "api_v2" | "wholesale" | "vostok";
  title: string;
  contact: { name: string; phone: string; email?: string; company?: string; inn?: string };
  order?: {
    number: string; currency: "RUB"; subtotalKopecks: number;
    discountKopecks: number; bonusSpentKopecks: number; totalKopecks: number; promoCode?: string;
    items: { productId?: string; name: string; qty: number; priceKopecks: number }[];
  };
  details?: { comment?: string; address?: string; topic?: string; format?: string; pageUrl?: string; sourceLabel?: string };
  consent?: { personalData: boolean; marketing?: boolean; version?: string; at?: string };
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
};

export type DeliveryResult =
  | { ok: true; dealId: string }
  | { ok: false; retryable: boolean; error: string };

export function selectedCrmProvider(): "HAYAT" | "LEGACY" {
  const provider = process.env.CRM_PROVIDER?.trim();
  if (!provider || provider === "bitrix") return "LEGACY";
  if (provider === "hayat") return "HAYAT";
  throw new Error("CRM_PROVIDER must be hayat, bitrix or unset");
}

export function validBearer(header: string | null, token: string): boolean {
  if (!token || !header) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${token}`));
}

export function retryDelayMs(attempt: number): number {
  return Math.min(3_600_000, 30_000 * 2 ** Math.min(10, Math.max(0, attempt - 1)));
}

function endpoint(source: "biohayat" | "vostok"): URL | null {
  try {
    const url = new URL(process.env.HAYAT_CRM_URL?.trim() || "");
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const localTest = loopback && process.env.HAYAT_CRM_ALLOW_LOOPBACK === "true" && process.env.NODE_ENV !== "production";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && localTest)) return null;
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return new URL(`/api/integrations/v1/events/${source}`, url);
  } catch {
    return null;
  }
}

async function acknowledgement(response: Response): Promise<unknown> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

/** One bounded attempt. The durable queue owns retries, not the request handler. */
export async function deliverCrmEvent(
  source: "biohayat" | "vostok",
  payload: string,
  identity: { kind: string; externalId: string },
): Promise<DeliveryResult> {
  const url = endpoint(source);
  const token = process.env.HAYAT_CRM_TOKEN?.trim();
  if (!url || !token || token.length < 32) {
    return { ok: false, retryable: true, error: "CRM_CONFIGURATION: проверьте URL и токен CRM" };
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: payload, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(8_000),
    });
    if (response.status !== 200 && response.status !== 201) {
      await response.body?.cancel();
      return {
        ok: false,
        retryable: [408, 429].includes(response.status) || response.status >= 500,
        error: `CRM_HTTP_${response.status}`,
      };
    }
    const body = await acknowledgement(response);
    if (body && typeof body === "object" && "accepted" in body && body.accepted === true &&
        "kind" in body && body.kind === identity.kind && "externalId" in body && body.externalId === identity.externalId &&
        "dealId" in body && typeof body.dealId === "string" && body.dealId.length > 0 && body.dealId.length <= 200 &&
        "duplicate" in body && typeof body.duplicate === "boolean") {
      return { ok: true, dealId: body.dealId };
    }
    // A missing/malformed response can follow a successful remote commit.
    return { ok: false, retryable: true, error: "CRM_ACK_INVALID" };
  } catch {
    // Never log remote bodies, URLs or exception messages that may contain secrets.
    return { ok: false, retryable: true, error: "CRM_NETWORK_OR_TIMEOUT" };
  }
}
