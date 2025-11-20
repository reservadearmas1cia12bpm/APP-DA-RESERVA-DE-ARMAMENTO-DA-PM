import { Material, Personnel, Cautela, SystemLog, AppSettings, GoogleDriveConfig, GoogleDriveFile, BackupFrequency, DailyPart } from '../types';

const KEYS = {
  MATERIALS: 'sentinela_materials',
  PERSONNEL: 'sentinela_personnel',
  CAUTELAS: 'sentinela_cautelas',
  LOGS: 'sentinela_logs',
  SETTINGS: 'sentinela_settings',
  ARMORER: 'sentinela_current_armorer',
  DAILY_PARTS: 'sentinela_daily_parts'
};

// Types for global Google objects
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

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

// Data Access Objects
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
    admins: [],
    backup: { enabled: false, frequency: BackupFrequency.NEVER }
  }),
  saveSettings: (data: AppSettings) => set(KEYS.SETTINGS, data),

  // --- DAILY BOOK ---
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
  // ------------------

  // Helpers for Logging
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

  // Backup & Restore Logic
  generateBackupData: () => {
     const data = {
      materials: StorageService.getMaterials(),
      personnel: StorageService.getPersonnel(),
      cautelas: StorageService.getCautelas(),
      logs: StorageService.getLogs(),
      settings: StorageService.getSettings(),
      dailyParts: StorageService.getDailyParts(),
      timestamp: new Date().toISOString(),
      version: '1.3',
      integrityHash: Date.now().toString()
    };
    return data;
  },

  createBackup: async (initiator: string = 'Sistema') => {
    const backupData = StorageService.generateBackupData();
    const jsonContent = JSON.stringify(backupData, null, 2);
    const fileName = `backup_sentinela_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    try {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        URL.revokeObjectURL(url);

        StorageService.addLog(initiator, 'Backup Local', `Backup criado e baixado. Tamanho: ${blob.size} bytes`);
        return true;
    } catch (e) {
        console.error("Error creating backup", e);
        StorageService.addLog(initiator, 'Erro Backup', 'Falha ao gerar arquivo de backup.');
        return false;
    }
  },

  createExcelBackup: async (initiator: string = 'Sistema') => {
      const dateStr = new Date().toISOString().split('T')[0];

      // Helper to escape CSV fields
      const escape = (field: any) => {
          const str = String(field || '');
          if (str.includes(';') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
      };

      // 1. Inventário
      const materials = StorageService.getMaterials();
      const matHeaders = ['Categoria', 'Tipo', 'Modelo', 'Calibre', 'Serial/Lote', 'Fabricante', 'Condição', 'Status', 'Validade', 'Quantidade', 'Obs'];
      const matRows = materials.map(m => [
          m.category,
          m.type,
          m.model,
          m.caliber || '-',
          m.serialNumber,
          m.manufacturer,
          m.condition,
          m.status,
          m.expiryDate || '-',
          m.quantity || '1',
          m.notes || ''
      ]);
      const matCSV = "\uFEFF" + [matHeaders.join(';'), ...matRows.map(r => r.map(escape).join(';'))].join('\n');
      
      // 2. Efetivo
      const personnel = StorageService.getPersonnel();
      const perHeaders = ['Nome', 'Posto/Grad', 'Matrícula', 'CPF', 'Unidade', 'Área', 'Telefone', 'Status', 'Obs'];
      const perRows = personnel.map(p => [
          p.name,
          p.rank,
          p.matricula,
          p.cpf,
          p.unit,
          p.area,
          p.phone,
          p.active ? 'Ativo' : 'Inativo',
          p.notes || ''
      ]);
      const perCSV = "\uFEFF" + [perHeaders.join(';'), ...perRows.map(r => r.map(escape).join(';'))].join('\n');

      // 3. Cautelas
      const cautelas = StorageService.getCautelas();
      const cauHeaders = ['ID', 'Policial', 'Armeiro Resp.', 'Data Saída', 'Data Devolução', 'Status', 'Itens', 'Obs Saída', 'Obs Devolução'];
      const cauRows = cautelas.map(c => [
          c.id,
          c.personnelName,
          c.armorerName,
          new Date(c.timestampOut).toLocaleString('pt-BR'),
          c.timestampIn ? new Date(c.timestampIn).toLocaleString('pt-BR') : 'Pendente',
          c.status === 'OPEN' ? 'Aberto' : 'Fechado',
          c.items.map(i => `${i.category} ${i.serialNumber} ${i.quantity > 1 ? `(x${i.quantity})` : ''}`).join(', '),
          c.notesOut || '',
          c.notesIn || ''
      ]);
      const cauCSV = "\uFEFF" + [cauHeaders.join(';'), ...cauRows.map(r => r.map(escape).join(';'))].join('\n');

      // Create single CSV with multiple sheets indicator
      const combinedCSV = `INVENTÁRIO DE MATERIAIS\n${matCSV}\n\nEFETIVO POLICIAL\n${perCSV}\n\nHISTÓRICO DE CAUTELAS\n${cauCSV}`;

      try {
          const blob = new Blob([combinedCSV], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sentinela_export_${dateStr}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          StorageService.addLog(initiator, 'Exportação Excel', 'Dados exportados para CSV.');
          return true;
      } catch (e) {
          console.error("Error creating CSV export", e);
          return false;
      }
  },

  restoreBackup: (file: File | string, callback: (success: boolean, message?: string) => void, initiator: string = 'Sistema') => {
    const processJson = (jsonString: string) => {
        try {
            const json = JSON.parse(jsonString);
            
            if (!json.version || !json.materials || !json.settings) {
                StorageService.addLog(initiator, 'Erro Restauração', 'Arquivo inválido ou corrompido.');
                callback(false, "Estrutura do arquivo inválida.");
                return;
            }

            StorageService.saveMaterials(json.materials);
            StorageService.savePersonnel(json.personnel);
            StorageService.saveCautelas(json.cautelas);
            StorageService.saveLogs(json.logs);
            StorageService.saveSettings(json.settings);
            if(json.dailyParts) set(KEYS.DAILY_PARTS, json.dailyParts);
            
            StorageService.addLog(initiator, 'Restauração', `Sistema restaurado. Versão: ${json.version}`);
            callback(true, "Dados restaurados com sucesso.");
        } catch (e) {
            console.error(e);
            StorageService.addLog(initiator, 'Erro Restauração', 'Erro ao processar JSON.');
            callback(false, "Erro crítico ao processar dados.");
        }
    };

    if (typeof file === 'string') {
        processJson(file);
        return;
    }

    // For file uploads
    const reader = new FileReader();
    reader.onload = (event) => {
         if (event.target?.result) {
             processJson(event.target.result as string);
         } else {
             callback(false, "Falha na leitura do arquivo.");
         }
    };
    reader.readAsText(file);
  },
  
  exportCSV: (data: any[], filename: string) => {
     // Legacy wrapper - mantido para compatibilidade
     console.log('Export CSV called:', filename);
  }
};

// Google Drive Integration Service (Simplified - sem backup automático complexo)
export const GoogleDriveService = {
    tokenClient: null as any,
    
    initClient: async (config: GoogleDriveConfig): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!window.gapi) {
                reject("Google API script not loaded");
                return;
            }
            
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({
                        apiKey: config.apiKey,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    });
                    
                    GoogleDriveService.tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: config.clientId,
                        scope: 'https://www.googleapis.com/auth/drive.file', 
                        callback: '',
                    });
                    
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    },

    getAccessToken: (): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!GoogleDriveService.tokenClient) {
                reject("Client not initialized");
                return;
            }
            GoogleDriveService.tokenClient.callback = (resp: any) => {
                if (resp.error) {
                    reject(resp);
                }
                resolve(resp.access_token);
            };
            GoogleDriveService.tokenClient.requestAccessToken({ prompt: '' });
        });
    },

    // Métodos simplificados do Google Drive
    uploadBackup: async (initiator: string = 'Sistema') => {
        try {
            const accessToken = await GoogleDriveService.getAccessToken();
            const backupData = StorageService.generateBackupData();
            const jsonContent = JSON.stringify(backupData, null, 2);
            const fileName = `backup_sentinela_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            
            const metadata = {
                name: fileName,
                mimeType: 'application/json',
            };
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([jsonContent], { type: 'application/json' }));

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form,
            });

            if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
            
            StorageService.addLog(initiator, 'Backup Drive', 'Backup enviado para Google Drive.');
            return true;
        } catch (e) {
            console.error(e);
            StorageService.addLog(initiator, 'Erro Backup Drive', 'Falha no envio para Google Drive.');
            throw e;
        }
    },

    runAutoBackupCheck: async () => {
        // Método simplificado - apenas log
        console.log("Auto backup check - Google Drive integration available");
    }
};
