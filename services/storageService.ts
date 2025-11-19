import { Material, Personnel, Cautela, SystemLog, AppSettings, Armorer, GoogleDriveConfig, GoogleDriveFile, BackupFrequency, DailyPart } from '../types';
import JSZip from 'jszip';

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
    const jsonContent = JSON.stringify(backupData);
    const fileName = `backup_sentinela_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
    
    try {
        const zip = new JSZip();
        zip.file("backup_sentinela.json", jsonContent);
        
        const blob = await zip.generateAsync({type: "blob"});
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
        console.error("Error creating zip backup", e);
        StorageService.addLog(initiator, 'Erro Backup', 'Falha ao gerar arquivo ZIP local.');
        return false;
    }
  },

  createExcelBackup: async (initiator: string = 'Sistema') => {
      const zip = new JSZip();
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
      zip.file("inventario_materiais.csv", matCSV);

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
      zip.file("efetivo_policial.csv", perCSV);

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
      zip.file("historico_cautelas.csv", cauCSV);

      try {
          const blob = await zip.generateAsync({type: "blob"});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sentinela_excel_export_${dateStr}.zip`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          StorageService.addLog(initiator, 'Exportação Excel', 'Dados exportados para Planilha (CSV/ZIP).');
          return true;
      } catch (e) {
          console.error("Error creating excel export", e);
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

    if (file.name.endsWith('.zip') || file.type.includes('zip')) {
        JSZip.loadAsync(file).then((zip) => {
            const jsonFile = Object.keys(zip.files).find(name => name.endsWith('.json'));
            if (jsonFile) {
                return zip.file(jsonFile)?.async("string");
            }
            throw new Error("JSON file not found in ZIP");
        }).then((content) => {
            if (content) processJson(content);
            else callback(false, "ZIP vazio ou ilegível.");
        }).catch((e) => {
            console.error("Error reading zip", e);
            callback(false, "Erro ao ler arquivo ZIP.");
        });
    } else {
        const reader = new FileReader();
        reader.onload = (event) => {
             if (event.target?.result) {
                 processJson(event.target.result as string);
             } else {
                 callback(false, "Falha na leitura do arquivo.");
             }
        };
        reader.readAsText(file);
    }
  },
  
  exportCSV: (data: any[], filename: string) => {
     // Legacy wrapper if needed
  }
};

// Google Drive Integration Service
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

    findOrCreateFolderChain: async (accessToken: string): Promise<string> => {
        const createFolder = async (name: string, parentId?: string) => {
            const metadata = {
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: parentId ? [parentId] : []
            };
            const response = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
                body: JSON.stringify(metadata)
            });
            const data = await response.json();
            return data.id;
        };

        const findFolder = async (name: string, parentId?: string) => {
            let query = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
            if (parentId) query += ` and '${parentId}' in parents`;
            const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + accessToken },
            });
            const data = await response.json();
            return data.files && data.files.length > 0 ? data.files[0].id : null;
        };

        let rootId = await findFolder('App_Controle_Armamento');
        if (!rootId) rootId = await createFolder('App_Controle_Armamento');

        let backupId = await findFolder('Backups', rootId);
        if (!backupId) backupId = await createFolder('Backups', rootId);

        return backupId;
    },

    uploadBackup: async (initiator: string = 'Sistema') => {
        try {
            const accessToken = await GoogleDriveService.getAccessToken();
            const folderId = await GoogleDriveService.findOrCreateFolderChain(accessToken);
            const backupData = StorageService.generateBackupData();
            const jsonContent = JSON.stringify(backupData);
            const zip = new JSZip();
            zip.file("backup_sentinela.json", jsonContent);
            const blob = await zip.generateAsync({type: "blob"});
            const fileName = `backup_auto_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
            const metadata = { name: fileName, mimeType: 'application/zip', parents: [folderId] };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form,
            });

            if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
            const result = await response.json();

            const currentSettings = StorageService.getSettings();
            if (currentSettings.backup) {
                currentSettings.backup.lastBackupDate = new Date().toISOString();
                StorageService.saveSettings(currentSettings);
            }

            StorageService.addLog(initiator, 'Backup Drive', `Backup automático enviado. ID: ${result.id}`);
            return true;
        } catch (e) {
            console.error(e);
            StorageService.addLog(initiator, 'Erro Backup Drive', 'Falha no envio para Google Drive.');
            throw e;
        }
    },

    listBackups: async (): Promise<GoogleDriveFile[]> => {
        const accessToken = await GoogleDriveService.getAccessToken();
        const folderId = await GoogleDriveService.findOrCreateFolderChain(accessToken);
        const query = `'${folderId}' in parents and trashed = false`;
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`, {
             method: 'GET',
             headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        });

        if (!response.ok) throw new Error(`List failed: ${response.statusText}`);
        const data = await response.json();
        return data.files;
    },

    downloadBackup: async (fileId: string): Promise<Blob> => {
         const accessToken = await GoogleDriveService.getAccessToken();
         const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
             method: 'GET',
             headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        });
        
        if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
        return await response.blob();
    },

    runAutoBackupCheck: async () => {
        const settings = StorageService.getSettings();
        if (!settings.googleDrive?.clientId || !settings.backup?.enabled) return;
        try {
            await GoogleDriveService.initClient(settings.googleDrive);
        } catch (e) {
            console.error("Could not init Google Client", e);
            return;
        }
        const lastBackup = settings.backup.lastBackupDate ? new Date(settings.backup.lastBackupDate) : null;
        const now = new Date();
        let shouldBackup = false;

        if (!lastBackup) {
            shouldBackup = true;
        } else {
            const diffHours = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);
            switch (settings.backup.frequency) {
                case BackupFrequency.ON_BOOT: shouldBackup = true; break;
                case BackupFrequency.DAILY: shouldBackup = diffHours >= 24; break;
                case BackupFrequency.WEEKLY: shouldBackup = diffHours >= 168; break;
                case BackupFrequency.MONTHLY: shouldBackup = diffHours >= 720; break;
            }
        }

        if (shouldBackup) {
            console.log("Triggering Auto Backup...");
            try { await GoogleDriveService.uploadBackup('Automático'); } catch (e) { console.error("Auto backup failed", e); }
        }
    }
};