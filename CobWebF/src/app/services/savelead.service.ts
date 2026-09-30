import {Service, signal} from '@angular/core';
import {Business} from '../models/business.model';
import {LeadStage, SavedLead} from '../models/savedLead.model';

const STORAGE_KEY = 'savedLeads';

@Service()
export class SaveleadService {
  readonly leads = signal<SavedLead[]>(loadLeads());

  isSaved(id: string): boolean {
    return this.leads().some((lead) => lead.id === id);
  }

  toggle(business: Business): void {
    this.leads.update((leads) =>
      this.isSaved(business.id)
        ? leads.filter((lead) => lead.id !== business.id)
        : [...leads, { ...business, stage: 'new', savedAt: new Date().toISOString() }],
    );
    this.persist();
  }

  setStage(id: string, stage: LeadStage): void {
    this.leads.update((leads) =>
      leads.map((lead) => (lead.id === id ? { ...lead, stage } : lead)),
    );
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.leads()));
  }
}

function loadLeads(): SavedLead[] {
  const raw: (Business & Partial<SavedLead>)[] = JSON.parse(
    localStorage.getItem(STORAGE_KEY) ?? '[]',
  );

  return raw.map((lead) => ({
    ...lead,
    stage: lead.stage ?? 'new',
    savedAt: lead.savedAt ?? new Date().toISOString(),
  }));
}
