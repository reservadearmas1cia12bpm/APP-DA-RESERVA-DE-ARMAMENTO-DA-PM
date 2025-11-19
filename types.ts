export enum MaterialCategory {
  WEAPON = 'Armamento',
  VEST = 'Colete Balístico',
  RADIO = 'Rádio HT',
  CUFFS = 'Algemas',
  AMMO = 'Munição',
  MAGAZINE = 'Carregador'
}

export enum MaterialStatus {
  AVAILABLE = 'Disponível',
  CHECKED_OUT = 'Em Cautela',
  MAINTENANCE = 'Manutenção',
  LOST = 'Extraviado',
  RETAINED = 'Retido'
}

export interface Material {
  id: string;
  category: MaterialCategory;
  type: string;
  model: string;
  serialNumber: string;
  manufacturer: string;
  condition: string;
  caliber?: string;
  expiryDate?: string;
  quantity?: number;
  status: MaterialStatus;
  personnelId?: string;
  location?: string; // New field for Maintenance/Retained
  notes?: string;
}

export interface Personnel {
  id: string;
  name: string;
  warName?: string;
  rank: string;
  numeral?: string;
  matricula: string;
  cpf: string;
  unit: string;
  area: string;
  phone: string;
  photoUrl?: string;
  active: boolean;
  notes?: string;
}

export interface CautelaItem {
  materialId: string;
  serialNumber: string;
  category: MaterialCategory;
  quantity: number;
}

export interface Cautela {
  id: string;
  personnelId: string;
  personnelName: string;
  armorerId: string;
  armorerName: string;
  armorerInId?: string;
  armorerInName?: string;
  items: CautelaItem[];
  timestampOut: string;
  timestampIn?: string;
  status: 'OPEN' | 'CLOSED';
  notesOut?: string;
  notesIn?: string;
  area?: string;
  signatureOut?: string;
  signatureIn?: string;
}

// --- DAILY BOOK TYPES ---

export interface DailyPartSchedule {
  grad: string;
  num: string;
  name: string;
  func: string;
  horario: string;
}

export interface DailyPartContent {
  header: {
    fiscal: string;
    dateVisto: string;
    crpm: string;
    bpm: string;
    city: string;
  };
  intro: {
    bpm: string;
    dateStart: string;
    dateEnd: string;
  };
  part1: DailyPartSchedule[];
  part2: string; // Instrução
  part3: string; // Assuntos Gerais
  part4: string; // Ocorrências
  part5: {
    substitute: string;
    city: string;
    date: string;
  };
}

export interface DailyPart {
  id: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
  status: 'DRAFT' | 'FINAL';
  content: DailyPartContent;
  signature?: string;
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

export interface Armorer {
  id: string;
  name: string;
  warName?: string;
  rank?: string;
  numeral?: string;
  matricula: string;
  role?: AdminRole;
}

export interface SystemLog {
  id: string;
  armorerName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Admin {
  id: string;
  name: string;
  warName?: string;
  rank?: string;
  numeral?: string;
  matricula: string;
  password?: string;
  role: AdminRole;
}

export interface GoogleDriveConfig {
  clientId: string;
  apiKey: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

export enum BackupFrequency {
  NEVER = 'never',
  ON_BOOT = 'on_boot',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export interface BackupSettings {
  enabled: boolean;
  frequency: BackupFrequency;
  lastBackupDate?: string;
  folderId?: string;
}

export interface AppSettings {
  institutionName: string;
  institutionLogo?: string;
  theme: 'light' | 'dark';
  admins?: Admin[];
  googleDrive?: GoogleDriveConfig;
  backup?: BackupSettings;
}