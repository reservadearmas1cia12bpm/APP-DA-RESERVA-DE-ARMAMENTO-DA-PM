// services/storageService.ts - VERSÃO MÍNIMA
import { Material, Personnel, Cautela, SystemLog, AppSettings, DailyPart } from '../types';

const KEYS = {
  MATERIALS: 'sentinela_materials',
  PERSONNEL: 'sentinela_personnel', 
  CAUTELAS: 'sentinela_cautelas',
  LOGS: 'sentinela_logs',
  SETTINGS: 'sentinela_settings',
  DAILY_PARTS: 'sentinela_daily_parts'
};

const get = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const set = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key}`, e);
  }
};

export const StorageService = {
  getMaterials: () => get<Material[]>(KEYS.MATERIALS, []),
  saveMaterials: (data: Material[]) => set(KEYS.MATERIALS, data),

  getPersonnel: () => get<Personnel[]>(KEYS.PERSONNEL, []),
  savePersonnel: (data: Personnel[]) => set(KEYS.PERSONNEL, data),

  getCautelas: () => get<Cautela[]>(KEYS.CAUTELAS, []),
  saveCautelas: (data: Cautela[]) => set(KEYS.CAUTELAS, data),

  getLogs: () => get<SystemLog[]>(KEYS.LOGS, []),
  saveLogs: (data: SystemLog[]) => set(KEYS.LOGS, data),

  getSettings: () => get<AppSettings>(KEYS.SETTINGS, {
    institutionName: 'Polícia Militar',
    theme: 'light',
    admins: []
  }),
  saveSettings: (data: AppSettings) => set(KEYS.SETTINGS, data),

  getDailyParts: () => get<DailyPart[]>(KEYS.DAILY_PARTS, []),
  saveDailyPart: (part: DailyPart) => {
    const parts = get<DailyPart[]>(KEYS.DAILY_PARTS, []);
    const index = parts.findIndex(p => p.id === part.id);
    if (index >= 0) parts[index] = part;
    else parts.unshift(part);
    set(KEYS.DAILY_PARTS, parts);
  },

  addLog: (armorerName: string, action: string, details: string) => {
    const logs = get<SystemLog[]>(KEYS.LOGS, []);
    const newLog: SystemLog = {
      id: Date.now().toString(),
      armorerName,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    set(KEYS.LOGS, [newLog, ...logs]);
  },

  // BACKUP SIMPLIFICADO - SEM ZIP
  createBackup: () => {
    const backupData = {
      materials: get<Material[]>(KEYS.MATERIALS, []),
      personnel: get<Personnel[]>(KEYS.PERSONNEL, []),
      cautelas: get<Cautela[]>(KEYS.CAUTELAS, []),
      logs: get<SystemLog[]>(KEYS.LOGS, []),
      settings: get<AppSettings>(KEYS.SETTINGS, {}),
      dailyParts: get<DailyPart[]>(KEYS.DAILY_PARTS, []),
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // RESTORE SIMPLIFICADO
  restoreBackup: (file: File, callback: (success: boolean, message?: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.materials) set(KEYS.MATERIALS, data.materials);
        if (data.personnel) set(KEYS.PERSONNEL, data.personnel);
        if (data.cautelas) set(KEYS.CAUTELAS, data.cautelas);
        if (data.logs) set(KEYS.LOGS, data.logs);
        if (data.settings) set(KEYS.SETTINGS, data.settings);
        if (data.dailyParts) set(KEYS.DAILY_PARTS, data.dailyParts);
        callback(true, 'Backup restaurado!');
      } catch (error) {
        callback(false, 'Erro ao restaurar backup');
      }
    };
    reader.readAsText(file);
  }
};

// SERVIÇO SIMPLES DO GOOGLE DRIVE
export const GoogleDriveService = {
  initClient: async () => true,
  uploadBackup: async () => true, 
  runAutoBackupCheck: async () => console.log('Google Drive não disponível')
};
