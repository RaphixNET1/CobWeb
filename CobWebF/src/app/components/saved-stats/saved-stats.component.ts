import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { LeadStatus } from '../../models/business.model';
import { SavedLead } from '../../models/savedLead.model';

// CWC
@Component({
  selector: 'app-saved-stats',
  templateUrl: './saved-stats.component.html',
  styleUrls: ['./saved-stats.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedStatsComponent {
  readonly leads = input<SavedLead[]>([]);
  readonly priorityOnly = input(false);

  protected readonly stats = computed(() => {
    const leads = this.leads();
    const count = (status: LeadStatus) => leads.filter((lead) => lead.status === status).length;
    const breakdown: { status: LeadStatus; label: string; count: number }[] = [
      { status: 'outdated', label: 'Outdated', count: count('outdated') },
      { status: 'noWebsite', label: 'No website', count: count('noWebsite') },
      { status: 'socialOnly', label: 'Social only', count: count('socialOnly') },
    ];

    return {
      total: leads.length,
      breakdown,
      averageScore: leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length) : 0,
    };
  });
}
