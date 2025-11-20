import { Material, Personnel, Cautela, SystemLog, AppSettings, DailyPart } from '../types';

const KEYS = {
  MATERIALS: 'sentinela_materials',
  PERSONNEL: 'sentinela_personnel',
  CAUTELAS: 'sentinela_cautelas',
  LOGS: 'sentinela_logs',
  SETTINGS: 'sentinela_settings',
  DAILY_PARTS: 'sentinela_daily_parts'
};

// Generic Getter
const get = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key}`, e);
    return defaultValue;
  }
};

// Generic Setter
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
      const parts = StorageService.getDailyParts();
      const index = parts.findIndex(p => p.id === part.id);
      if (index >= 0) {
          parts[index] = part;
      } else {
          parts.unshift(part);
      }
      set(KEYS.DAILY_PARTS, parts);
  },

  addLog: (armorerName: string, action: string, details: string) => {
    const logs = StorageService.getLogs();
    const newLog: SystemLog = {
      id: Date.now().toString(),
      armorerName,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    StorageService.saveLogs([newLog, ...logs]);
  },

  // SIMPLE BACKUP - NO ZIP
  createBackup: (initiator: string = 'Sistema') => {
    const backupData = {
      materials: StorageService.getMaterials(),
      personnel: StorageService.getPersonnel(),
      cautelas: StorageService.getCautelas(),
      logs: StorageService.getLogs(),
      settings: StorageService.getSettings(),
      dailyParts: StorageService.getDailyParts(),
      timestamp: new Date().toISOString(),
      version: '1.3'
    };
    
    const jsonContent = JSON.stringify(backupData, null, 2);
    const fileName = `backup_sentinela_${new Date().toISOString().split('T')[0]}.json`;
    
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);

    StorageService.addLog(initiator, 'Backup Local', 'Backup criado com sucesso');
    return true;
  },

  // SIMPLE RESTORE
  restoreBackup: (file: File, callback: (success: boolean, message?: string) => void, initiator: string = 'Sistema') => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          callback(false, "Falha na leitura do arquivo.");
          return;
        }

        const json = JSON.parse(event.target.result as string);
        
        if (!json.materials || !json.settings) {
          callback(false, "Arquivo inválido ou corrompido.");
          return;
        }

        StorageService.saveMaterials(json.materials);
        StorageService.savePersonnel(json.personnel || []);
        StorageService.saveCautelas(json.cautelas || []);
        StorageService.saveLogs(json.logs || []);
        StorageService.saveSettings(json.settings);
        if (json.dailyParts) set(KEYS.DAILY_PARTS, json.dailyParts);
        
        StorageService.addLog(initiator, 'Restauração', 'Sistema restaurado com sucesso');
        callback(true, "Dados restaurados com sucesso.");
      } catch (e) {
        console.error(e);
        callback(false, "Erro ao processar arquivo.");
      }
    };
    reader.readAsText(file);
  },

  // SIMPLE CSV EXPORT
  createExcelBackup: (initiator: string = 'Sistema') => {
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Materials CSV
    const materials = StorageService.getMaterials();
    const matHeaders = ['Categoria', 'Tipo', 'Modelo', 'Serial', 'Status'];
    const matRows = materials.map(m => [m.category, m.type, m.model, m.serialNumber, m.status]);
    const matCSV = [matHeaders.join(';'), ...matRows.map(r => r.join(';'))].join('\n');
    
    // Personnel CSV  
    const personnel = StorageService.getPersonnel();
    const perHeaders = ['Nome', 'Posto', 'Matrícula', 'Unidade'];
    const perRows = personnel.map(p => [p.name, p.rank, p.matricula, p.unit]);
    const perCSV = [perHeaders.join(';'), ...perRows.map(r => r.join(';'))].join('\n');
    
    const combinedCSV = `MATERIAIS\n${matCSV}\n\nEFETIVO\n${perCSV}`;
    
    const blob = new Blob([combinedCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinela_export_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    
    StorageService.addLog(initiator, 'Exportação CSV', 'Dados exportados para CSV');
    return true;
  },

  // Legacy method for compatibility
  exportCSV: (data: any[], filename: string) => {
    console.log('Export CSV:', filename);
  }
};

// SIMPLE Google Drive Service (placeholder)
export const GoogleDriveService = {
  initClient: async () => {
    console.log('Google Drive init - not implemented');
    return true;
  },
  
  uploadBackup: async () => {
    console.log('Google Drive upload - not implemented');
    return true;
  },
  
  runAutoBackupCheck: async () => {
    console.log('Auto backup check - Google Drive not available');
  }
};
