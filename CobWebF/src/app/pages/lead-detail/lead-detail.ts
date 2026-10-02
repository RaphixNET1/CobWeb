import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  ArrowLeft,
  BookmarkCheck,
  BookmarkX,
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
} from 'lucide-angular';

import {
  scoreLevel,
  searchUrl,
  statusLabel,
  websiteLabel,
} from '../../models/business.model';
import { SavedLead } from '../../models/savedLead.model';
import { SaveleadService } from '../../services/savelead.service';
import { LeadFindingsComponent } from '../../components/lead-findings/lead-findings.component';

@Component({
  imports: [LucideAngularModule, RouterLink, DatePipe, LeadFindingsComponent],
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

  protected readonly scoreLevel = scoreLevel;
  protected readonly searchUrl = searchUrl;
  protected readonly statusLabel = statusLabel;
  protected readonly websiteLabel = websiteLabel;

  private readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))));

  readonly lead = computed(() => this.saved.leads().find((lead) => lead.id === this.id()));

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
}
