import {Component, computed, inject, signal} from '@angular/core';
import { BookmarkCheck, Bookmark, ArrowDownWideNarrow, ExternalLink, Clock, LucideAngularModule, Mail, Phone, HeartPlus, HeartMinus } from 'lucide-angular';
import { SavedLead } from '../../models/savedLead.model';
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

  protected readonly ArrowDownWideNarrow = ArrowDownWideNarrow;
  protected readonly Clock = Clock;

  readonly sortMode = signal<'newest' | 'score'>('newest');

  readonly visibleLeads = computed(() => {
    const leads = [...this.saved.leads()];

    return this.sortMode() === 'score'
      ? leads.sort((a, b) => b.score - a.score)
      : leads.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  });

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
  isFavorite(lead: SavedLead): boolean {
    return lead.stage === 'priority';
  }

  toggleFavorite(lead: SavedLead): void {
    this.saved.setStage(lead.id, this.isFavorite(lead) ? 'new' : 'priority');
  }
}
