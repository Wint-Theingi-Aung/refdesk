/**
 * App-wide constants for the Links MVP.
 * Categories stay flexible (free text on create/edit); these are suggestions only.
 */

export const SUGGESTED_CATEGORIES = [
  "Development",
  "Design",
  "Productivity",
  "Research",
  "Reading",
  "Tools",
  "Other",
] as const;

export const RESOURCE_TYPE = {
  LINK: "LINK",
} as const;

export type ResourceTypeId = (typeof RESOURCE_TYPE)[keyof typeof RESOURCE_TYPE];

/** Only LINK is implemented in the MVP; other types are reserved for later. */
export const IMPLEMENTED_RESOURCE_TYPES: ResourceTypeId[] = [RESOURCE_TYPE.LINK];
