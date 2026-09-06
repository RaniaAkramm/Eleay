// A curated list of 120+ popular TLDs. Focused on gTLDs and new gTLDs that
// reliably support RDAP (required by ICANN for all gTLD registries), plus a
// handful of ccTLDs known to run public RDAP servers.
export const TLD_LIST: string[] = [
  // Classic / most common
  "com", "net", "org", "info", "biz", "co",
  // Tech & startup
  "io", "ai", "app", "dev", "tech", "codes", "digital", "systems", "software",
  "cloud", "network", "engineer", "computer", "email", "chat", "link", "click",
  "page", "website", "site", "online", "xyz", "wiki",
  // Business
  "company", "group", "global", "world", "agency", "consulting", "ventures",
  "capital", "finance", "fund", "money", "investments", "solutions", "services",
  "management", "partners", "holdings", "enterprises", "industries", "supply",
  "trade", "expert", "directory", "exchange", "broker", "estate",
  // Creative & media
  "studio", "design", "media", "creative", "art", "gallery", "film", "video",
  "music", "audio", "photography", "photos", "graphics",
  // Shopping & commerce
  "shop", "store", "boutique", "market", "deals", "discount", "coupons",
  "sale", "cash", "gold",
  // Food & lifestyle
  "coffee", "cafe", "bar", "pub", "restaurant", "kitchen", "recipes", "food",
  "wine", "pizza", "catering",
  // Health & beauty
  "fitness", "gym", "yoga", "health", "clinic", "dental", "care", "beauty",
  "salon", "spa",
  // Events & community
  "events", "party", "wedding", "community", "social", "forum", "club",
  "team", "network",
  // Home, travel & other lifestyle
  "travel", "tours", "vacation", "rentals", "properties", "house", "land",
  "garden", "farm", "pet", "dance",
  // Country-code TLDs with public RDAP
  "us", "uk", "in", "au", "de", "es", "nl", "eu",
  // Misc popular new gTLDs
  "guide", "help", "support", "tools", "email", "country", "boutique",
  "black", "cool", "bot", "cards", "fish",
];

// Small affix pools used to generate "starts with" / "ends with" / "contains"
// variations, since we generate candidate domains rather than search a
// pre-crawled index. Kept short on purpose to bound the number of checks.
export const PREFIXES: string[] = ["get", "my", "the", "go", "use", "try"];
export const SUFFIXES: string[] = ["ly", "hq", "hub", "app", "co", "labs", "spot", "base"];

// Hard cap on how many domain candidates a single search will check, to keep
// response times reasonable and stay within serverless function limits.
export const MAX_CANDIDATES = 220;

// Of the registered domains found, how many will get an on-demand title/
// server lookup (fetching the live page is the slowest part of a search).
export const MAX_DETAIL_LOOKUPS = 40;
