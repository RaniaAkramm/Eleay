"use client";

import { useMemo, useState } from "react";
import type { DomainResult, MatchMode, SearchResponse } from "@/lib/types";

const MODES: { value: MatchMode; label: string; hint: string }[] = [
  { value: "exact", label: "Exact", hint: "word.tld" },
  { value: "start", label: "Starts with", hint: "word + suffix" },
  { value: "end", label: "Ends with", hint: "prefix + word" },
  { value: "middle", label: "Contains", hint: "prefix + word + suffix" },
];

function StatusDot({ status }: { status: DomainResult["status"] }) {
  const color =
    status === "available" ? "bg-mint" : status === "registered" ? "bg-amber" : "bg-muted";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

function StatusLabel({ status }: { status: DomainResult["status"] }) {
  if (status === "available") return <span className="text-mint">available</span>;
  if (status === "registered") return <span className="text-amber">registered</span>;
  return <span className="text-muted">unknown</span>;
}

function ResultRow({ result }: { result: DomainResult }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-panel/60">
      <StatusDot status={result.status} />
      <div className="min-w-0 flex-1">
        <div className="font-domain text-sm">
          <span className="text-[#E7EBF2]">{result.label}</span>
          <span className="text-muted">.{result.tld}</span>
        </div>
        {(result.title || result.server) && (
          <div className="mt-0.5 truncate text-xs text-muted">
            {result.title ?? ""}
            {result.title && result.server ? " · " : ""}
            {result.server ?? ""}
          </div>
        )}
      </div>
      <div className="font-domain text-xs shrink-0">
        <StatusLabel status={result.status} />
      </div>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<MatchMode>("exact");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const word = query.trim();
    if (!word) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(word)}&mode=${mode}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        setData(null);
      } else {
        setData(json as SearchResponse);
      }
    } catch {
      setError("Could not reach the server. Try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    if (!data) return null;
    return {
      registered: data.results.filter((r) => r.status === "registered"),
      available: data.results.filter((r) => r.status === "available"),
      unknown: data.results.filter((r) => r.status === "unknown"),
    };
  }, [data]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-16 sm:pt-24">
      <header className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Namefield
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          Type a word. See it checked live across 120+ domain extensions.
        </p>
      </header>

      <form onSubmit={runSearch} className="mt-10">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-panel px-4 py-3 focus-within:border-mint">
          <span className="text-muted">/</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. owln"
            className="font-domain w-full bg-transparent text-base outline-none placeholder:text-muted/60"
            autoFocus
            maxLength={63}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="shrink-0 rounded-xl bg-[#E7EBF2] px-4 py-2 text-sm font-medium text-ink transition disabled:opacity-40"
          >
            {loading ? "Checking…" : "Search"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                mode === m.value
                  ? "border-mint text-mint"
                  : "border-line text-muted hover:border-muted"
              }`}
              title={m.hint}
            >
              {m.label}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <p className="mt-8 text-center text-sm text-rust">{error}</p>
      )}

      {loading && !data && (
        <p className="mt-12 text-center text-sm text-muted">
          Querying registries — this can take up to a minute for the full extension list.
        </p>
      )}

      {data && grouped && (
        <div className="mt-12">
          <p className="text-center text-sm text-muted">
            <span className="font-domain text-[#E7EBF2]">{data.query}</span> checked across{" "}
            <span className="font-domain text-[#E7EBF2]">{data.total}</span> extensions —{" "}
            <span className="text-amber">{data.registeredCount} taken</span>,{" "}
            <span className="text-mint">{data.availableCount} available</span>
            {data.unknownCount > 0 && (
              <>, <span className="text-muted">{data.unknownCount} unchecked</span></>
            )}
          </p>

          <div className="mt-6 space-y-6">
            {grouped.available.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-line">
                <div className="border-b border-line bg-panel px-4 py-2 text-xs text-muted">
                  Available ({grouped.available.length})
                </div>
                {grouped.available.map((r) => (
                  <ResultRow key={r.domain} result={r} />
                ))}
              </section>
            )}

            {grouped.registered.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-line">
                <div className="border-b border-line bg-panel px-4 py-2 text-xs text-muted">
                  Registered ({grouped.registered.length})
                </div>
                {grouped.registered.map((r) => (
                  <ResultRow key={r.domain} result={r} />
                ))}
              </section>
            )}

            {grouped.unknown.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-line opacity-70">
                <div className="border-b border-line bg-panel px-4 py-2 text-xs text-muted">
                  Unchecked — no public registry response ({grouped.unknown.length})
                </div>
                {grouped.unknown.map((r) => (
                  <ResultRow key={r.domain} result={r} />
                ))}
              </section>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
