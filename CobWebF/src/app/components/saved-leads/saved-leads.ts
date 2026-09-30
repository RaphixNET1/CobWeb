import { Component, inject } from '@angular/core';
import { BookmarkCheck, Bookmark, ExternalLink, LucideAngularModule, Mail, Phone, HeartPlus, HeartMinus } from 'lucide-angular';

import { SaveleadService } from '../../services/savelead.service';
@Component({
  imports: [
    LucideAngularModule
  ],
  selector: 'app-saved-leads',
  styleUrl: './saved-leads.css',
  templateUrl: './saved-leads.html',
})
export class SavedLeads {
  protected readonly saved = inject(SaveleadService);

  protected readonly Bookmark = Bookmark;
  protected readonly BookmarkCheck = BookmarkCheck;
  protected readonly ExternalLink = ExternalLink;
  protected readonly Phone = Phone;
  protected readonly Mail = Mail;
  protected readonly HeartPlus = HeartPlus;
  protected readonly HeartMinus = HeartMinus;

  scoreLevel(score: number): string {
    if (score >= 70) return 'hot';
    if (score >= 40) return 'warm';
    return 'mild';
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'noWebsite': return 'No website';
      case 'socialOnly': return 'Social only';
      case 'outdated': return 'Outdated';
      default: return status;
    }
  }
}
