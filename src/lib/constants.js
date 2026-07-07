export const CATEGORIES = [
  "General Comments",
  "General Policy Violation",
  "Late for Shift",
  "Missing/Expiring Item",
  "No Call, No Show",
  "Other",
  "PHI",
  "Questions/Clarification",
  "Reminder",
  "Request to Leave Early",
  "Rude/Bullying/Intimidation",
  "Rule Violation",
  "Safety",
  "Status Quo",
  "Supply Need",
];

export const CUSTOM_TEMPLATE_CATEGORIES = [
  "PHI",
  "Late for Shift",
  "No Call, No Show",
  "Request to Leave Early",
];

export const ROLES = {
  MASTER_ADMIN: "master_admin",
  LEADERSHIP: "leadership",
  GENERAL_USER: "general_user",
};

export const GENERAL_USER_RESTRICTED_CATEGORIES = [
  "Late for Shift",
  "No Call, No Show",
  "Request to Leave Early",
];

export const ATTACHMENT_SUSPENSION_OPTIONS = [
  { label: "1 Hour", value: 60 },
  { label: "2 Hours", value: 120 },
  { label: "4 Hours", value: 240 },
  { label: "8 Hours", value: 480 },
  { label: "24 Hours", value: 1440 },
  { label: "1 Week", value: 10080 },
  { label: "Indefinite", value: -1 },
];

export const SUBMISSION_FLAGS = [
  "Important",
  "For Review by Union",
];