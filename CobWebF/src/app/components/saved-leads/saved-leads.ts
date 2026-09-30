import { Component, computed, inject, signal } from '@angular/core';
import {
  ArrowDownWideNarrow,
  Bookmark,
  BookmarkCheck,
  Clock,
  ExternalLink,
  Heart,
  HeartMinus,
  HeartPlus,
  LucideAngularModule,
  Mail,
  Phone,
} from 'lucide-angular';

import { SavedLead } from '../../models/savedLead.model';
import { SaveleadService } from '../../services/savelead.service';

@Component({
  imports: [LucideAngularModule],
  selector: 'app-saved-leads',
  styleUrl: './saved-leads.css',
  templateUrl: './saved-leads.html',
})
export class SavedLeads {
  protected readonly saved = inject(SaveleadService);

  protected readonly ArrowDownWideNarrow = ArrowDownWideNarrow;
  protected readonly Bookmark = Bookmark;
  protected readonly BookmarkCheck = BookmarkCheck;
  protected readonly Clock = Clock;
  protected readonly ExternalLink = ExternalLink;
  protected readonly Heart = Heart;
  protected readonly HeartMinus = HeartMinus;
  protected readonly HeartPlus = HeartPlus;
  protected readonly Mail = Mail;
  protected readonly Phone = Phone;

  readonly sortMode = signal<'newest' | 'score'>('newest');
  readonly onlyPriority = signal(false);

  readonly priorityCount = computed(
    () => this.saved.leads().filter((lead) => this.isFavorite(lead)).length,
  );

  readonly visibleLeads = computed(() => {
    let leads = [...this.saved.leads()];

    if (this.onlyPriority()) {
      leads = leads.filter((lead) => this.isFavorite(lead));
    }

    return this.sortMode() === 'score'
      ? leads.sort((a, b) => b.score - a.score)
      : leads.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  });

  isFavorite(lead: SavedLead): boolean {
    return lead.stage === 'priority';
  }

  toggleFavorite(lead: SavedLead): void {
    this.saved.setStage(lead.id, this.isFavorite(lead) ? 'new' : 'priority');
  }

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
