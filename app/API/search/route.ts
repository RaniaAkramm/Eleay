import { NextRequest, NextResponse } from "next/server";
import { buildCandidates } from "@/lib/candidates";
import { fetchPageMeta } from "@/lib/pagemeta";
import { checkDomain, mapWithConcurrency } from "@/lib/rdap";
import { MAX_DETAIL_LOOKUPS } from "@/lib/tlds";
import { DomainResult, MatchMode, SearchResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow this route to run longer than the default 10s, since checking 100+
// TLDs plus a batch of title lookups can take a while. Requires a Vercel
// plan that supports it (Hobby: up to 60s if enabled, Pro: up to 300s).
export const maxDuration = 60;

const VALID_MODES: MatchMode[] = ["start", "middle", "end", "exact"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const modeParam = (searchParams.get("mode") ?? "exact") as MatchMode;
  const mode = VALID_MODES.includes(modeParam) ? modeParam : "exact";

  if (!q) {
    return NextResponse.json({ error: "A word is required." }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9-]{1,63}$/.test(q)) {
    return NextResponse.json(
      { error: "Use letters, numbers, and hyphens only." },
      { status: 400 }
    );
  }

  const candidates = buildCandidates(q, mode);

  const checked = await mapWithConcurrency(candidates, 25, async (c) => {
    const { status } = await checkDomain(c.domain, c.tld);
    const result: DomainResult = {
      domain: c.domain,
      label: c.label,
      tld: c.tld,
      status,
      checkedAt: new Date().toISOString(),
    };
    return result;
  });

  const registered = checked.filter((r) => r.status === "registered");
  const toEnrich = registered.slice(0, MAX_DETAIL_LOOKUPS);

  await mapWithConcurrency(toEnrich, 10, async (r) => {
    const meta = await fetchPageMeta(r.domain);
    r.title = meta.title;
    r.server = meta.server;
    return r;
  });

  // Sort: exact-word registered domains first, then other registered, then
  // available, then unknown. Within each group, keep the original order
  // (which already prioritizes exact word across TLDs).
  const rank = (r: DomainResult) => {
    if (r.status === "registered") return r.label === q.toLowerCase() ? 0 : 1;
    if (r.status === "available") return 2;
    return 3;
  };
  checked.sort((a, b) => rank(a) - rank(b));

  const response: SearchResponse = {
    query: q,
    mode,
    total: checked.length,
    registeredCount: checked.filter((r) => r.status === "registered").length,
    availableCount: checked.filter((r) => r.status === "available").length,
    unknownCount: checked.filter((r) => r.status === "unknown").length,
    results: checked,
  };

  return NextResponse.json(response);
}
