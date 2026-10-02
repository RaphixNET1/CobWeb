export type LeadStatus = 'noWebsite' | 'socialOnly' | 'outdated';

export type IssueCode =
  | 'unreachable'
  | 'noHttps'
  | 'noViewport'
  | 'fixedViewport'
  | 'oldCopyright'
  | 'noImprint'
  | 'noPrivacy'
  | 'legacyTech'
  | 'oldJquery'
  | 'oldCms'
  | 'siteBuilder'
  | 'slow'
  | 'fixedWidth'
  | 'staleContent'
  | 'ieHacks'
  | 'oldBootstrap'
  | 'oldServer'
  | 'oldTracking'
  | 'mixedContent'
  | 'http1'
  | 'noSecurityHeaders'
  | 'unoptimizedImages'
  | 'noMetaDescription';

export interface WebsiteIssue {
  code: IssueCode;
  // Share of the lead score.
  points: number;
  // e.g. "2016" for an old copyright or "Joomla 2.5" for an old CMS.
  detail: string | null;
}

// A business the backend flagged as lead: no website, only social media, or an outdated website.
export interface Business {
  // OSM reference, e.g. "node/123456".
  id: string;
  name: string;
  // Human readable OSM category, e.g. "Hairdresser".
  category: string;
  website: string | null;
  // Website was not in OSM but derived from the email domain.
  websiteFromEmail: boolean;
  address: string | null;
  lat: number;
  lon: number;
  // Distance to the search center.
  distanceKm: number;

  phone: string | null;
  email: string | null;
  openingHours: string | null;
  facebook: string | null;
  instagram: string | null;

  status: LeadStatus;
  // 0-100, higher = better lead.
  score: number;
  issues: WebsiteIssue[];
  checks?: IssueCode[];
}

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error';

export interface CheckedSite {
  n: number;
  name: string;
  lead: boolean;
}

export interface DetectionProgress {
  checked: number;
  total: number;
  leads: number;
  recent: CheckedSite[];
}

export type DetectionEvent =
  | ({ type: 'progress' } & DetectionProgress)
  | { type: 'result'; businesses: Business[] };

export type ScoreLevel = 'hot' | 'warm' | 'mild';

export function scoreLevel(score: number): ScoreLevel {
  return score >= 75 ? 'hot' : score >= 45 ? 'warm' : 'mild';
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  noWebsite: 'No website',
  socialOnly: 'Social only',
  outdated: 'Outdated',
};

export function statusLabel(status: LeadStatus): string {
  return STATUS_LABELS[status];
}

const ISSUE_LABELS: Record<IssueCode, string> = {
  unreachable: 'Offline',
  noHttps: 'No HTTPS',
  noViewport: 'Not mobile',
  fixedViewport: 'Fake mobile',
  oldCopyright: 'Old ©',
  noImprint: 'No Impressum',
  noPrivacy: 'No privacy page',
  legacyTech: 'Legacy tech',
  oldJquery: 'Old jQuery',
  oldCms: 'Old CMS',
  siteBuilder: 'Site builder',
  slow: 'Slow',
  fixedWidth: 'Fixed width',
  staleContent: 'Stale content',
  ieHacks: 'IE hacks',
  oldBootstrap: 'Old Bootstrap',
  oldServer: 'Old server',
  oldTracking: 'Dead analytics',
  mixedContent: 'Mixed content',
  http1: 'HTTP/1.1',
  noSecurityHeaders: 'No security headers',
  unoptimizedImages: 'Heavy images',
  noMetaDescription: 'No meta description',
};

export function issueName(code: IssueCode): string {
  return ISSUE_LABELS[code];
}

export function issueLabel(issue: WebsiteIssue): string {
  switch (issue.code) {
    case 'oldCopyright':
      return issue.detail ? `© ${issue.detail}` : ISSUE_LABELS.oldCopyright;
    case 'staleContent':
      return issue.detail ? `Last date ${issue.detail}` : ISSUE_LABELS.staleContent;
    case 'oldCms':
    case 'oldJquery':
    case 'oldBootstrap':
    case 'oldServer':
    case 'siteBuilder':
      return issue.detail ?? ISSUE_LABELS[issue.code];
    default:
      return ISSUE_LABELS[issue.code];
  }
}

// Longer explanation for tooltips, e.g. "Legacy tech: Flash, Frames".
export function issueTitle(issue: WebsiteIssue): string {
  const base = ISSUE_LABELS[issue.code];
  return issue.detail ? `${base}: ${issue.detail} (+${issue.points})` : `${base} (+${issue.points})`;
}

// Quick manual cross-check: OSM may simply miss a business' website.
export function searchUrl(business: Business): string {
  const query = [business.name, business.address].filter(Boolean).join(' ');
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

// "https://www.example.com/shop/" -> "example.com/shop"
export function websiteLabel(website: string): string {
  try {
    const url = new URL(website);
    const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
    return url.hostname.replace(/^www\./, '') + path;
  } catch {
    return website;
  }
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
