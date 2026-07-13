import Dexie, { type Table } from 'dexie';
import type { Project, PunchItem, Contact } from '../types';

export type GreetingWord = 'Howdy' | 'Hey' | 'Welcome' | "Mornin'" | 'Hola';
export type FontChoice = 'default' | 'dyslexic';
export type SendPreference = 'text' | 'email' | 'both';
export type ThemeMode = 'light' | 'dark';

export interface Profile {
  id: 'main';
  // Profile tab
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  companyName: string;
  signOff: string;
  photoDataUrl?: string;
  greetingEnabled: boolean;
  greetingWord: GreetingWord;

  // Message templates tab
  emailSubject: string;
  emailIntro: string;
  emailSignOff: string;
  textIntro: string;
  textSignOff: string;

  // Notifications tab
  notifySendConfirmations: boolean;
  notifyDailySummary: boolean;
  notifyWeeklySummary: boolean;
  notifyStageChanges: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "19:00"
  quietHoursEnd: string; // "07:00"

  // Contacts default routing
  defaultSendPreference: SendPreference;

  // Accessibility tab
  fontChoice: FontChoice;
  fontScale: number; // 1.0 = default; 0.9 | 1.0 | 1.15 | 1.3 | 1.5
  highContrast: boolean;
  themeMode?: ThemeMode; // undefined = follow system
  accentColor?: string; // accent palette id (see config/accents); undefined = maroon default

  // Weather source
  weatherCommunityId?: string;

  updatedAt: string;
}

export interface Community {
  id: string;
  name: string;
  lat: number;
  lon: number;
  isDefault: boolean;
  createdAt: string;
}

export interface CommunityHome {
  id: string;
  communityId: string;
  address: string;
  lot?: string;
  stage: 'Pre-construction' | 'Framing' | 'Drywall' | 'Paint' | 'Trim' | 'Tile' | 'Punch' | 'Complete';
  startDate?: string;
  targetCompletionDate?: string;
  createdAt: string;
}

export interface FieldLangEntry {
  id: string;
  term: string;
  trade: string;
  aliases: string[];
  createdAt: string;
}

export interface AiUsageRecord {
  month: string; // YYYY-MM
  voiceSeconds: number;
  visionCalls: number;
  estimatedCostCents: number;
  updatedAt: string;
}

export interface ItemPhoto {
  id: string;
  itemId: string;      // PunchItem id from server
  projectId: string;
  dataUrl: string;     // base64 image
  takenAt: string;
  createdAt: number;
}

export interface Lot {
  id?: number;
  lotBlock: string;
  address: string;
  plan: string;
  elevation: string;
  scarStage: string;
  productType: string;
  fieldContact: string;
  buyer?: string;
  vfdDate: string;
  estFinish: string;
  currentTask: string;
  taskDays: number;
  updatedAt: string;
  notes?: string;
  createdAt: number;
}

export interface EmailRef {
  id?: number;
  lotId?: number;
  trade?: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  flagged: number; // 0 or 1 for indexing
}

export class CondenserDB extends Dexie {
  projects!: Table<Project>;
  items!: Table<PunchItem>;
  contacts!: Table<Contact>;
  lots!: Table<Lot>;
  emails!: Table<EmailRef>;
  profile!: Table<Profile>;
  communities!: Table<Community>;
  communityHomes!: Table<CommunityHome>;
  fieldLanguage!: Table<FieldLangEntry>;
  aiUsage!: Table<AiUsageRecord, string>;
  itemPhotos!: Table<ItemPhoto, string>;

  constructor() {
    super('CondenserExperimentalDB');
    this.version(2).stores({
      projects: 'id, address, community, status',
      items: 'id, projectId, trade, status',
      contacts: 'id, name, trade',
      lots: '++id, lotBlock, address, scarStage, vfdDate, fieldContact',
      emails: '++id, lotId, trade, date, flagged',
    });
    this.version(3).stores({
      projects: 'id, address, community, status',
      items: 'id, projectId, trade, status',
      contacts: 'id, name, trade',
      lots: '++id, lotBlock, address, scarStage, vfdDate, fieldContact',
      emails: '++id, lotId, trade, date, flagged',
      profile: 'id',
      communities: 'id, isDefault',
      communityHomes: 'id, communityId, stage',
    });
    this.version(4).stores({
      projects: 'id, address, community, status',
      items: 'id, projectId, trade, status',
      contacts: 'id, name, trade',
      lots: '++id, lotBlock, address, scarStage, vfdDate, fieldContact',
      emails: '++id, lotId, trade, date, flagged',
      profile: 'id',
      communities: 'id, isDefault',
      communityHomes: 'id, communityId, stage',
      fieldLanguage: 'id, trade',
      aiUsage: 'month',
    });
    this.version(5).stores({
      projects: 'id, address, community, status',
      items: 'id, projectId, trade, status',
      contacts: 'id, name, trade',
      lots: '++id, lotBlock, address, scarStage, vfdDate, fieldContact',
      emails: '++id, lotId, trade, date, flagged',
      profile: 'id',
      communities: 'id, isDefault',
      communityHomes: 'id, communityId, stage',
      fieldLanguage: 'id, trade',
      aiUsage: 'month',
      itemPhotos: 'id, itemId, projectId',
    });
  }
}

export const db = new CondenserDB();

/** Cache projects from the server into Dexie */
export async function cacheProjects(projects: Project[]) {
  await db.projects.bulkPut(projects);
}

/** Cache items for a project */
export async function cacheItems(items: PunchItem[]) {
  if (!items.length) return;
  await db.items.bulkPut(items);
}

/** Cache contacts */
export async function cacheContacts(contacts: Contact[]) {
  await db.contacts.bulkPut(contacts);
}

/** Get cached projects (offline fallback) */
export async function getCachedProjects(): Promise<Project[]> {
  return db.projects.where('status').equals('active').toArray();
}

/** Get a cached project with its items */
export async function getCachedProject(id: string): Promise<Project | undefined> {
  const project = await db.projects.get(id);
  if (!project) return undefined;
  const items = await db.items.where('projectId').equals(id).toArray();
  return { ...project, items };
}

/** Get cached contacts */
export async function getCachedContacts(): Promise<Contact[]> {
  return db.contacts.orderBy('name').toArray();
}
