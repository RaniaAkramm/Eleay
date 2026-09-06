export type MatchMode = "start" | "middle" | "end" | "exact";

export type DomainStatus = "registered" | "available" | "unknown";

export interface DomainResult {
  domain: string;
  label: string;
  tld: string;
  status: DomainStatus;
  title?: string;
  server?: string;
  checkedAt: string;
}

export interface SearchResponse {
  query: string;
  mode: MatchMode;
  total: number;
  registeredCount: number;
  availableCount: number;
  unknownCount: number;
  results: DomainResult[];
}
