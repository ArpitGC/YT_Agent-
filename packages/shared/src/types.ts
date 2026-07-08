export type ApprovalMode = "AUTO" | "REVIEW";

export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "AWAITING_APPROVAL"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export interface OptimizationRequest {
  userId: string;
  channelId: string;
  videoId?: string;
  notes?: string;
}

export interface GeneratedMetadata {
  title: string;
  description: string;
  tags: string[];
  topicSummary: string;
  thumbnailUrl?: string;
}
