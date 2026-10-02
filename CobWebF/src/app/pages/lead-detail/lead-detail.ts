import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  ArrowLeft,
  BookmarkCheck,
  BookmarkX,
  CircleCheck,
  Clock,
  ExternalLink,
  Facebook,
  Heart,
  HeartMinus,
  HeartPlus,
  Instagram,
  LucideAngularModule,
  Mail,
  MapPin,
  Phone,
  Search,
  TriangleAlert,
} from 'lucide-angular';

import {
  IssueCode,
  WebsiteIssue,
  issueLabel,
  scoreLevel,
  searchUrl,
  statusLabel,
  websiteLabel,
} from '../../models/business.model';
import { SavedLead } from '../../models/savedLead.model';
import { SaveleadService } from '../../services/savelead.service';

const ISSUE_REASONS: Record<IssueCode, string> = {
  unreachable:
    'The website did not respond, returned 404/410 or a server error. For customers the business is effectively offline.',
  noHttps:
    'The site is not served via HTTPS or the certificate is invalid. Browsers show a "Not secure" warning and Google ranks it lower.',
  noViewport:
    'No viewport meta tag found. The page is not optimized for smartphones and renders as a shrunken desktop page.',
  fixedViewport:
    'The viewport has a fixed pixel width instead of device-width. It only pretends to be mobile-friendly.',
  oldCopyright:
    'The newest copyright year in the footer is more than three years old. The site has most likely not been maintained since.',
  noImprint:
    'No link to an Impressum / legal notice found. In Germany this is mandatory and a legal risk (Abmahnung).',
  noPrivacy:
    'No link to a privacy policy (Datenschutz) found. Required under GDPR as soon as any data is processed.',
  legacyTech:
    'Outdated technology detected, e.g. Flash, framesets, HTML 4 tags or an old doctype. Modern browsers barely support it.',
  oldJquery:
    'jQuery below version 3 is loaded. These versions have known security vulnerabilities.',
  oldCms:
    'The CMS version is no longer supported or the site was built with a legacy editor. No security updates anymore.',
  siteBuilder:
    'Built with a site builder. Usually limited in design, SEO and performance – a good upgrade opportunity.',
  slow: 'The page took longer than three seconds to load. Visitors leave and search rankings suffer.',
};

@Component({
  imports: [LucideAngularModule, RouterLink, DatePipe],
  selector: 'app-lead-detail',
  styleUrl: './lead-detail.css',
  templateUrl: './lead-detail.html',
})
export class LeadDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly saved = inject(SaveleadService);

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly BookmarkCheck = BookmarkCheck;
  protected readonly BookmarkX = BookmarkX;
  protected readonly CircleCheck = CircleCheck;
  protected readonly Clock = Clock;
  protected readonly ExternalLink = ExternalLink;
  protected readonly Facebook = Facebook;
  protected readonly Heart = Heart;
  protected readonly HeartMinus = HeartMinus;
  protected readonly HeartPlus = HeartPlus;
  protected readonly Instagram = Instagram;
  protected readonly Mail = Mail;
  protected readonly MapPin = MapPin;
  protected readonly Phone = Phone;
  protected readonly Search = Search;
  protected readonly TriangleAlert = TriangleAlert;

  protected readonly issueLabel = issueLabel;
  protected readonly scoreLevel = scoreLevel;
  protected readonly searchUrl = searchUrl;
  protected readonly statusLabel = statusLabel;
  protected readonly websiteLabel = websiteLabel;

  private readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))));

  readonly lead = computed(() => this.saved.leads().find((lead) => lead.id === this.id()));

  readonly pointsTotal = computed(
    () => this.lead()?.issues.reduce((sum, issue) => sum + issue.points, 0) ?? 0,
  );

  readonly statusReason = computed(() => {
    const lead = this.lead();
    if (!lead) return '';

    switch (lead.status) {
      case 'noWebsite':
        return 'No website is listed in OpenStreetMap and none could be derived from the email domain. The business is practically invisible online – a classic new-website lead.';
      case 'socialOnly':
        return 'The business is only present on social media (Facebook / Instagram), but has no own website. It is clearly active online and already invests in visibility – the strongest kind of lead.';
      case 'outdated':
        return 'A website exists, but the automatic check found the problems listed below. Each finding adds points to the lead score (max. 100).';
    }
  });

  isFavorite(lead: SavedLead): boolean {
    return lead.stage === 'priority';
  }

  toggleFavorite(lead: SavedLead): void {
    this.saved.setStage(lead.id, this.isFavorite(lead) ? 'new' : 'priority');
  }

  remove(lead: SavedLead): void {
    this.saved.toggle(lead);
    this.router.navigate(['/saved']);
  }

  issueReason(issue: WebsiteIssue): string {
    return ISSUE_REASONS[issue.code];
  }

  issueShare(issue: WebsiteIssue): number {
    return Math.min(100, issue.points);
  }
}
