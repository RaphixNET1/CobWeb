import { Business } from './business.model';

export type LeadStage =
  | 'new'
  | 'priority'
  | 'contacted'
  | 'interested'
  | 'won'
  | 'notInterested';

export interface SavedLead extends Business {
  stage: LeadStage;
  savedAt: string;
}
