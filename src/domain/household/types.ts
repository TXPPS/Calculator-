import { PersonId } from '../splits/types';

export interface HouseholdConfig {
  id: 'household';
  personNames: Record<PersonId, string>;
  appName: string;
  currency: string;
  locale: string;
  defaultSplitMethod: 'even' | 'percentage' | 'incomeProportional';
  onboardingComplete: boolean;
  schemaVersion: number;
}

export const DEFAULT_HOUSEHOLD: HouseholdConfig = {
  id: 'household',
  personNames: { person1: 'Person 1', person2: 'Person 2' },
  appName: 'Household Plan',
  currency: 'USD',
  locale: 'en-US',
  defaultSplitMethod: 'even',
  onboardingComplete: false,
  schemaVersion: 1,
};
