export const CATEGORIES = [
  "Food & Dining",
  "Travel",
  "Transport",
  "Utilities",
  "Rent",
  "Office Supplies",
  "Software & Subscriptions",
  "Professional Services",
  "Equipment",
  "Marketing",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
