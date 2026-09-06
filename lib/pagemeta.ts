interface PageMeta {
  title?: string;
  server?: string;
}

async function fetchOnce(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DomainSearchBot/1.0)",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

// Best-effort fetch of a registered domain's homepage to extract the page
// title and server header. Fails silently (returns an empty object) for
// sites that are slow, unreachable, or block automated requests — this is
// decoration on top of the RDAP status, not something the result depends on.
export async function fetchPageMeta(domain: string): Promise<PageMeta> {
  for (const url of [`https://${domain}`, `http://${domain}`]) {
    try {
      const res = await fetchOnce(url, 4000);
      const server = res.headers.get("server") ?? undefined;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("html")) {
        return { server };
      }
      const html = await res.text();
      const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = match ? match[1].trim().slice(0, 120) : undefined;
      return { title, server };
    } catch {
      // try the next scheme
    }
  }
  return {};
}
