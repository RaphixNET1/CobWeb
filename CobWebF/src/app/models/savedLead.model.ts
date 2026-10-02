import { Business } from './business.model';

export type LeadStage =
  | 'new'
  | 'priority'
  // Not used in the UI yet – reserved for a future sales pipeline.
  | 'contacted' // Depends on the future of CobWeb usage
  | 'interested' // Depends on the future of CobWeb usage
  | 'won' // Depends on the future of CobWeb usage
  | 'notInterested'; // Depends on the future of CobWeb usage

export interface SavedLead extends Business {
  stage: LeadStage;
  savedAt: string;
}
