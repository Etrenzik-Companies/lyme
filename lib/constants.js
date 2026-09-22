export const SITE_NAME_FALLBACK = 'The Lyme Accountability Project';

/** Public signature milestones, used by the counter bar and the social worker. */
export const MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000];

export const RELATIONSHIPS = {
  patient: 'Patient',
  caregiver: 'Caregiver',
  bereaved: 'Lost someone',
  clinician: 'Clinician',
  supporter: 'Supporter',
};

export const NEWS_CATEGORIES = ['research', 'policy', 'surveillance', 'community', 'legal', 'general'];

/** Unapproved social drafts expire rather than posting. */
export const SOCIAL_DRAFT_TTL_HOURS = 48;

/** Headline figures, kept in one place so the site and the social worker never disagree. */
export const HEADLINE = {
  latestYear: 2023,
  latestCases: 89468,
  estimatedAnnual: 476000,
  firstYear: 1996,
  firstCases: 16455,
};
