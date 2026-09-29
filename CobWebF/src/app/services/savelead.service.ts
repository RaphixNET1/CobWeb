import {Service, signal} from '@angular/core';
import {Business} from '../models/business.model';

const STORAGE_KEY = 'savedLeads';

@Service()
export class SaveleadService {
  readonly leads = signal<Business[]>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));

  isSaved(id: string) {
    return this.leads().some((lead) => lead.id === id);
  }

  toggle(business: Business) {
    this.leads.update((leads) =>
      this.isSaved(business.id)
        ? leads.filter((lead) => lead.id !== business.id)
        : [...leads, business],
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.leads()));
  }
}
