import { MAX_CANDIDATES, PREFIXES, SUFFIXES, TLD_LIST } from "./tlds";
import { MatchMode } from "./types";

export interface Candidate {
  label: string;
  tld: string;
  domain: string;
}

// Builds the list of label variants for a given word and match mode.
// - exact:  just the word itself
// - start:  word + suffix   (word sits at the start of the label)
// - end:    prefix + word   (word sits at the end of the label)
// - middle: prefix + word + suffix (word sits in the middle of the label)
function buildLabels(word: string, mode: MatchMode): string[] {
  const labels = new Set<string>([word]);

  if (mode === "start" || mode === "middle") {
    for (const s of SUFFIXES) labels.add(`${word}${s}`);
  }
  if (mode === "end" || mode === "middle") {
    for (const p of PREFIXES) labels.add(`${p}${word}`);
  }
  if (mode === "middle") {
    for (const p of PREFIXES) {
      for (const s of SUFFIXES) labels.add(`${p}${word}${s}`);
    }
  }

  return Array.from(labels);
}

// Produces the full candidate domain list for a search, always prioritizing
// the exact word across every TLD first (the highest-signal result), then
// filling remaining budget with affix variants across the TLD list until
// MAX_CANDIDATES is reached.
export function buildCandidates(rawWord: string, mode: MatchMode): Candidate[] {
  const word = rawWord.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!word) return [];

  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  function add(label: string, tld: string) {
    const domain = `${label}.${tld}`;
    if (seen.has(domain)) return;
    if (candidates.length >= MAX_CANDIDATES) return;
    seen.add(domain);
    candidates.push({ label, tld, domain });
  }

  // Always cover the exact word across the full TLD list first.
  for (const tld of TLD_LIST) {
    add(word, tld);
  }

  if (mode !== "exact") {
    const labels = buildLabels(word, mode).filter((l) => l !== word);
    outer: for (const label of labels) {
      for (const tld of TLD_LIST) {
        if (candidates.length >= MAX_CANDIDATES) break outer;
        add(label, tld);
      }
    }
  }

  return candidates;
}
