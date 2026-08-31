export const EVENT_STATUS = {
  published: "published",
  pendingReview: "pending_review",
  rejected: "rejected",
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];
