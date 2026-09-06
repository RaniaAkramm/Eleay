import { DomainStatus } from "./types";

const BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const BOOTSTRAP_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface BootstrapCache {
  fetchedAt: number;
  map: Map<string, string[]>;
}

// Module-scope cache: persists across warm invocations of the same
// serverless instance, so we don't re-download the bootstrap file on every
// search.
let cache: BootstrapCache | null = null;

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getBootstrapMap(): Promise<Map<string, string[]>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < BOOTSTRAP_TTL_MS) {
    return cache.map;
  }

  const map = new Map<string, string[]>();
  try {
    const res = await fetchWithTimeout(BOOTSTRAP_URL, 8000);
    if (res.ok) {
      const data = (await res.json()) as { services?: unknown };
      const services = Array.isArray(data.services) ? (data.services as unknown[]) : [];
      for (const service of services) {
        if (!Array.isArray(service) || service.length < 2) continue;
        const [tlds, urls] = service as [unknown, unknown];
        if (!Array.isArray(tlds) || !Array.isArray(urls)) continue;
        const validUrls = urls.filter((u): u is string => typeof u === "string");
        for (const tld of tlds) {
          if (typeof tld === "string" && validUrls.length > 0) {
            map.set(tld.toLowerCase(), validUrls);
          }
        }
      }
    }
  } catch {
    // If the bootstrap fetch fails, fall back to whatever we had cached
    // before (even if stale) rather than failing every lookup.
    if (cache) return cache.map;
  }

  cache = { fetchedAt: now, map };
  return map;
}

function pickBase(urls: string[]): string {
  const base = urls[0];
  return base.endsWith("/") ? base : `${base}/`;
}

export interface RdapLookupResult {
  status: DomainStatus;
}

// Looks up a single domain via RDAP. Returns "unknown" if the TLD has no
// public RDAP server, the request times out, or the registry returns
// anything other than a clear 200 (registered) / 404 (available).
export async function checkDomain(domain: string, tld: string): Promise<RdapLookupResult> {
  const bootstrap = await getBootstrapMap();
  const urls = bootstrap.get(tld.toLowerCase());
  if (!urls || urls.length === 0) {
    return { status: "unknown" };
  }

  const base = pickBase(urls);
  const target = `${base}domain/${domain}`;

  try {
    const res = await fetchWithTimeout(target, 5000, {
      headers: { Accept: "application/rdap+json" },
    });
    if (res.status === 200) return { status: "registered" };
    if (res.status === 404) return { status: "available" };
    return { status: "unknown" };
  } catch {
    return { status: "unknown" };
  }
}

// Simple concurrency-limited map, used so we don't fire off hundreds of
// simultaneous RDAP requests at once.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, run);
  await Promise.all(workers);
  return results;
}
