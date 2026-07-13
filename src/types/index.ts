export interface Project {
  id: string;
  userId: string;
  address: string;
  community: string;
  lot: string;
  status: string;
  date: string;
  stage: string;
  startDate: string | null;
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PunchItem[];
  files?: SourceFile[];
  _count?: { items: number; files: number };
  statusCounts?: { pending: number; wip: number; done: number };
}

export const BUILD_STAGES = [
  'Pre-construction', 'Framing', 'Drywall', 'Paint', 'Trim', 'Tile', 'Punch', 'Complete',
] as const;

export interface DashboardFeedItem {
  id: string;
  title: string;
  subtitle?: string;
  timestamp?: string;
  accent?: 'warn' | 'info' | 'success';
}

export interface DashboardSummary {
  heroes: {
    activeHomes: number;
    completedThisMonth: number;
    completedThisQuarter: number;
    avgBuildDays: number | null;
  };
  stageData: { stage: string; count: number }[];
  velocity: { month: string; avgDays: number }[];
  punchActivity: { week: string; count: number }[];
  tradeLoad: { name: string; value: number; count: number }[];
  needsAttention: DashboardFeedItem[];
  upcoming: DashboardFeedItem[];
  recentActivity: DashboardFeedItem[];
  hasProjects: boolean;
}

export interface PunchItem {
  id: string;
  projectId: string;
  text: string;
  trade: string;
  assignee: string;
  status: 'pending' | 'wip' | 'done';
  priority: 'normal' | 'elevated' | 'hot';
  source: string;
  sourceFileId: string | null;
  location: string;
  notes: string;
  sendDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  tradeSteps?: TradeStep[];
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  trade: string;
  notes: string;
  preferredChannel: 'email' | 'text' | 'both';
  channelOverrideUntil: string | null;
  createdAt: string;
}

export interface SourceFile {
  id: string;
  projectId: string;
  originalName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
  pageCount: number | null;
  extractionStatus: 'pending' | 'processing' | 'done' | 'failed';
  extractedItemCount: number;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  type: 'email' | 'text';
  subject: string;
  body: string;
  isDefault: boolean;
  createdAt: string;
}

export interface TradeStep {
  id: string;
  punchItemId: string;
  trade: string;
  sequence: number;
  status: 'waiting' | 'active' | 'done';
  note: string;
  dueDate: string | null;
  createdAt: string;
}

export interface ExtractedItem {
  text: string;
  trade: string;
  priority: 'normal' | 'elevated' | 'hot';
  location: string | null;
  repaired: boolean;
}
