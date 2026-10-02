import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  CircleCheck,
  Code,
  FileText,
  Gauge,
  LucideAngularModule,
  LucideIconData,
  Scale,
  ShieldAlert,
  Smartphone,
  WifiOff,
} from 'lucide-angular';

import { Business, IssueCode, issueLabel, issueName } from '../../models/business.model';

type Category = 'availability' | 'security' | 'mobile' | 'technology' | 'content' | 'legal' | 'performance';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const MIN_LEAD_POINTS = 20;
const MIN_MAJOR_POINTS = 10;
const MAX_SCORE = 100;

const CATEGORIES: { id: Category; label: string; icon: LucideIconData }[] = [
  { id: 'availability', label: 'Availability', icon: WifiOff },
  { id: 'security', label: 'Security', icon: ShieldAlert },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
  { id: 'technology', label: 'Technology', icon: Code },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'legal', label: 'Legal', icon: Scale },
  { id: 'performance', label: 'Performance', icon: Gauge },
];

const ISSUE_CATEGORY: Record<IssueCode, Category> = {
  unreachable: 'availability',
  noHttps: 'security',
  mixedContent: 'security',
  noSecurityHeaders: 'security',
  oldServer: 'security',
  noViewport: 'mobile',
  fixedViewport: 'mobile',
  fixedWidth: 'mobile',
  legacyTech: 'technology',
  ieHacks: 'technology',
  oldJquery: 'technology',
  oldBootstrap: 'technology',
  oldCms: 'technology',
  siteBuilder: 'technology',
  oldTracking: 'technology',
  oldCopyright: 'content',
  staleContent: 'content',
  noMetaDescription: 'content',
  noImprint: 'legal',
  noPrivacy: 'legal',
  slow: 'performance',
  http1: 'performance',
  unoptimizedImages: 'performance',
};

const ISSUE_REASONS: Record<IssueCode, string> = {
  unreachable:
    'The homepage did not load: no response within 10 seconds (two attempts), a 404/410 page or a server error. For customers the business is effectively offline.',
  noHttps:
    'The page is delivered without HTTPS, or the certificate is broken and only plain HTTP works. Browsers label it "Not secure" and Google ranks it lower.',
  mixedContent:
    'The HTTPS page still loads images, scripts or styles over plain HTTP. Browsers block or warn about these resources.',
  noSecurityHeaders:
    'None of the standard security headers (HSTS, Content-Security-Policy, X-Content-Type-Options) is sent – typical for basic, unmanaged hosting.',
  oldServer:
    'The server reveals its software version in the response headers, and that version is end-of-life (PHP < 8.2, Apache < 2.4, IIS < 10). It no longer receives security fixes.',
  noViewport:
    'The HTML has no <meta name="viewport"> tag. Smartphones render the page as a zoomed-out desktop page – the clearest sign it was never built for mobile.',
  fixedViewport:
    'The viewport tag sets a fixed pixel width instead of width=device-width. The page only pretends to be mobile-friendly.',
  fixedWidth:
    'The main layout container has a fixed pixel width outside of any media query. On phones visitors have to zoom and scroll sideways. "No media queries" means the stylesheets contain no responsive rules at all.',
  legacyTech:
    'Technology from the early 2000s: Flash, framesets, nested layout tables, presentational HTML 4 tags like <font> or <center>, or a pre-HTML5 doctype.',
  ieHacks:
    'Workarounds for Internet Explorer (conditional comments, html5shiv, respond.js). IE has been dead since 2022 – these date the code to roughly 2010–2016.',
  oldJquery:
    'jQuery 1.x or 2.x is loaded. These versions are unmaintained and have known XSS vulnerabilities (CVE-2020-11022 / 11023).',
  oldBootstrap:
    'Bootstrap 3 or older is used. Unsupported since 2019 and a typical marker of templates from the mid 2010s.',
  oldCms:
    'The CMS version (read from the generator tag or the version of core files) is end-of-life – e.g. WordPress < 6, Joomla < 4, TYPO3 < 10 – or the site was made with a desktop editor like FrontPage or Dreamweaver. No more security updates.',
  siteBuilder:
    'Built with a website builder like Jimdo or Wix. It works, but design, SEO and performance are limited – and the business pays a subscription for it.',
  oldTracking:
    'Google Universal Analytics is still embedded, but it stopped collecting data in July 2023. Nobody has looked at the tracking – or the site – since.',
  oldCopyright:
    'The newest year in the copyright notice is more than 3 years old (more than 7 years counts extra). A forgotten footer is a strong hint that nobody maintains the site.',
  staleContent:
    'The newest date found anywhere – news, events, image uploads, publish/modify dates, the Last-Modified header – is more than 3 years old. The content has likely not been touched since.',
  noMetaDescription:
    'No meta description. Google has to guess which text to show in the search results.',
  noImprint:
    'No link to an Impressum / Offenlegung found. Mandatory for businesses (ECG / MedienG in Austria, DDG in Germany); missing it risks warnings and fines.',
  noPrivacy:
    'No link to a privacy policy (Datenschutzerklärung) found. Required by the GDPR as soon as cookies, forms or analytics are used.',
  slow: 'The HTML alone took more than 3 seconds to arrive. Visitors leave and search rankings suffer.',
  http1:
    'The server only speaks HTTP/1.1. Modern hosting uses HTTP/2 or HTTP/3, which load pages noticeably faster.',
  unoptimizedImages:
    'At least 5 images, but no modern formats (WebP/AVIF), no responsive srcset and no lazy loading. Every visitor downloads full-size images.',
};

const PASSED_LABELS: Record<IssueCode, string> = {
  unreachable: 'Reachable',
  noHttps: 'HTTPS',
  mixedContent: 'No mixed content',
  noSecurityHeaders: 'Security headers',
  oldServer: 'Server up to date',
  noViewport: 'Mobile viewport',
  fixedViewport: 'Flexible viewport',
  fixedWidth: 'Fluid layout',
  legacyTech: 'Modern HTML',
  ieHacks: 'No IE hacks',
  oldJquery: 'Current jQuery',
  oldBootstrap: 'Current Bootstrap',
  oldCms: 'CMS up to date',
  siteBuilder: 'No site builder',
  oldTracking: 'Current analytics',
  oldCopyright: 'Current copyright',
  staleContent: 'Recent content',
  noMetaDescription: 'Meta description',
  noImprint: 'Impressum',
  noPrivacy: 'Privacy policy',
  slow: 'Fast response',
  http1: 'HTTP/2+',
  unoptimizedImages: 'Optimized images',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function severity(points: number): Severity {
  if (points >= 25) return 'critical';
  if (points >= 15) return 'high';
  if (points >= 10) return 'medium';
  return 'low';
}

@Component({
  selector: 'app-lead-findings',
  templateUrl: './lead-findings.component.html',
  styleUrls: ['./lead-findings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
})
export class LeadFindingsComponent {
  protected readonly CircleCheck = CircleCheck;
  protected readonly minLeadPoints = MIN_LEAD_POINTS;
  protected readonly minMajorPoints = MIN_MAJOR_POINTS;

  readonly lead = input.required<Business>();

  private readonly findings = computed(() =>
    [...this.lead().issues]
      .sort((a, b) => b.points - a.points)
      .map((issue) => ({
        ...issue,
        label: issueLabel(issue),
        name: issueName(issue.code),
        severity: severity(issue.points),
        severityLabel: SEVERITY_LABELS[severity(issue.points)],
        reason: ISSUE_REASONS[issue.code],
      })),
  );

  protected readonly total = computed(() => this.findings().reduce((sum, issue) => sum + issue.points, 0));

  private readonly scale = computed(() => Math.max(this.total(), MAX_SCORE));

  protected readonly segments = computed(() =>
    this.findings().map((issue) => ({
      ...issue,
      width: (issue.points / this.scale()) * 100,
    })),
  );

  protected readonly thresholdPosition = computed(() => (MIN_LEAD_POINTS / this.scale()) * 100);

  protected readonly formula = computed(() => this.findings().map((issue) => issue.points).join(' + '));

  protected readonly groups = computed(() =>
    CATEGORIES.map((category) => {
      const issues = this.findings().filter((issue) => ISSUE_CATEGORY[issue.code] === category.id);
      return { ...category, issues, points: issues.reduce((sum, issue) => sum + issue.points, 0) };
    }).filter((group) => group.issues.length),
  );

  protected readonly passed = computed(() => {
    const checks = this.lead().checks;
    if (!checks) return null;

    const failed = new Set(this.lead().issues.map((issue) => issue.code));
    return checks
      .filter(
        (code) =>
          !failed.has(code) &&
          !(code === 'fixedViewport' && failed.has('noViewport')) &&
          !(code === 'siteBuilder' && failed.has('oldCms')),
      )
      .map((code) => PASSED_LABELS[code]);
  });

  protected readonly statusReason = computed(() => {
    const lead = this.lead();
    switch (lead.status) {
      case 'noWebsite':
        return 'No website is listed in OpenStreetMap and none could be derived from the email domain (free-mail addresses like gmail.com are ignored). Fixed score of 50: the business clearly needs a website, but there is no sign yet that it actively wants to be online.';
      case 'socialOnly':
        return 'No own website, but a Facebook or Instagram profile is listed. Fixed score of 95: the business already invests in being visible online, so a real website is the easiest sell – the strongest kind of lead.';
      case 'outdated': {
        const checked = lead.checks?.length;
        return `A website exists and was checked automatically: the homepage plus up to 3 stylesheets were loaded${checked ? ` and ${checked} checks were run` : ''}. Every failed check adds points depending on its severity – the sum (max. 100) is the lead score.`;
      }
    }
  });
}
