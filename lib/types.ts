export type Role = "owner" | "admin" | "member";

export type ThreatSeverity = "critical" | "high" | "medium" | "low";
export type ThreatStatus = "active" | "investigating" | "contained" | "resolved";

export interface OrgMember {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  orgId: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: "trial" | "pro" | "enterprise";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  createdAt: string;
}

export interface ThreatEvent {
  id: string;
  orgId: string;
  title: string;
  severity: ThreatSeverity;
  status: ThreatStatus;
  sourceIp: string;
  vector: string;
  detectedAt: string;
  assignedTo?: string;
}

export interface ComplianceFramework {
  id: string;
  orgId: string;
  name: "SOC2 Type II" | "GDPR" | "HIPAA" | string;
  status: "compliant" | "in-progress" | "at-risk";
  completion: number;
  lastAuditedAt: string;
}

export type PlaybookStatus = "idle" | "running" | "success" | "failed";

export interface ResponsePlaybook {
  id: string;
  orgId: string;
  name: string;
  trigger: string;
  status: PlaybookStatus;
  lastRunAt?: string;
  meanTimeToRespondMinutes: number;
}

export interface TrainingModule {
  id: string;
  orgId: string;
  title: string;
  category: string;
  completionRate: number;
  durationMinutes: number;
}

export interface NotificationPreferences {
  uid: string;
  orgId: string;
  criticalThreatAlerts: boolean;
  complianceDriftWarnings: boolean;
  playbookRunResults: boolean;
  weeklyTrainingReminders: boolean;
  updatedAt: string;
}

/** API envelope so every route returns a consistent, role-filtered shape. */
export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}
