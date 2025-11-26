import React, { useState, useEffect } from 'react';
import { Material, Personnel, Armorer, DailyPart, DailyPartSchedule, MaterialCategory, MaterialStatus } from '../types';
import { StorageService } from '../services/storageService';
import { DocumentService } from '../services/documentService';
import { Printer, FileText, Save, Plus, ArrowLeft, RefreshCw, Trash2, Edit3, CheckCircle, PenTool, X, Calendar } from 'lucide-react';
import { SignaturePad } from '../components/SignaturePad';

interface DailyBookProps {
  materials: Material[];
  personnel: Personnel[];
  armorer: Armorer | null;
  institutionName: string;
}

export const DailyBookPage: React.FC<DailyBookProps> = ({ materials, personnel, armorer, institutionName }) => {
  const [mode, setMode] = useState<'LIST' | 'EDITOR'>('LIST');
  const [history, setHistory] = useState<DailyPart[]>([]);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  
  // Editor State
  const [currentPartId, setCurrentPartId] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(true);
  
  // --- FORM STATES ---
  const [dateVisto, setDateVisto] = useState('');
  const [fiscalName, setFiscalName] = useState('');
  const [crpm, setCrpm] = useState('');
  const [bpm, setBpm] = useState('');
  const [city, setCity] = useState('FORTALEZA');
  
  // DATAS AUTOMÁTICAS - HOJE E AMANHÃ
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const [introDateStart, setIntroDateStart] = useState(today.toISOString().split('T')[0]);
  const [introDateEnd, setIntroDateEnd] = useState(tomorrow.toISOString().split('T')[0]);

  const [schedule, setSchedule] = useState<DailyPartSchedule[]>([
      { grad: 'CB', num: '30671015', name: 'WILLIAM SIQUEIRA', func: 'Armeiro', horario: '07h-07h' }
  ]);

  const [part2Text, setPart2Text] = useState('Sem alterações.');
  const [part3Text, setPart3Text] = useState('');
  const [part4Text, setPart4Text] = useState('Sem alterações a registrar.');

  const [substituteName, setSubstituteName] = useState('');
  const [signCity, setSignCity] = useState('FORTALEZA');
  const [signDate, setSignDate] = useState(today.toISOString().split('T')[0]);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = () => setHistory(StorageService.getDailyParts());

  // Helper: format date por extenso (com opção de incluir dia da semana) - CORRIGIDA
  const formatDateLong = (isoDate: string | undefined | null, includeWeekday = true) => {
    if (!isoDate || isoDate === '') return '___';
    
    try {
      let dateObj: Date;
      
      // Remove qualquer timezone ou hora que possa estar presente
      const dateOnly = isoDate.split('T')[0];
      
      // Verifica se é formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        const [year, month, day] = dateOnly.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } 
      // Verifica se é formato DD/MM/YYYY
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateOnly)) {
        const [day, month, year] = dateOnly.split('/').map(Number);
        dateObj = new Date(year, month - 1, day);
      }
      // Tenta parsear como está
      else {
        dateObj = new Date(dateOnly);
      }
      
      // Verifica se a data é válida
      if (isNaN(dateObj.getTime())) {
        console.warn('Data inválida:', isoDate);
        return '___';
      }

      const meses = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];
      const diasSemana = [
        'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 
        'quinta-feira', 'sexta-feira', 'sábado'
      ];
      
      const dia = dateObj.getDate();
      const mes = meses[dateObj.getMonth()];
      const ano = dateObj.getFullYear();
      
      if (includeWeekday) {
        const weekday = diasSemana[dateObj.getDay()];
        return `${dia} de ${mes} de ${ano} (${weekday})`;
      } else {
        return `${dia} de ${mes} de ${ano}`;
      }
    } catch (e) {
      console.error('Erro ao formatar data:', e, 'Data:', isoDate);
      return '___';
    }
  };

  // Função específica para exportação que garante datas válidas
  const formatDateForExport = (isoDate: string | undefined | null, includeWeekday = true) => {
    if (!isoDate || isoDate === '') return '___';
    
    try {
      // Garante que temos apenas a parte da data (YYYY-MM-DD)
      const dateStr = isoDate.split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      
      const dateObj = new Date(year, month - 1, day);
      
      if (isNaN(dateObj.getTime())) {
        return '___';
      }

      const meses = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];
      const diasSemana = [
        'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 
        'quinta-feira', 'sexta-feira', 'sábado'
      ];
      
      const dia = dateObj.getDate();
      const mes = meses[dateObj.getMonth()];
      const ano = dateObj.getFullYear();
      
      if (includeWeekday) {
        const weekday = diasSemana[dateObj.getDay()];
        return `${dia} de ${mes} de ${ano} (${weekday})`;
      } else {
        return `${dia} de ${mes} de ${ano}`;
      }
    } catch (e) {
      return '___';
    }
  };

  const generateInventoryText = () => {
    const getStats = (cat: MaterialCategory) => {
        const items = materials.filter(m => m.category === cat);
        const groups: Record<string, { total: number; available: number; checkedOut: number; maintenance: number }> = {};
        items.forEach(m => {
            const key = `${m.type} ${m.model}`;
            if (!groups[key]) groups[key] = { total: 0, available: 0, checkedOut: 0, maintenance: 0 };
            const qty = m.quantity || 1;
            groups[key].total += qty;
            if (m.status === MaterialStatus.AVAILABLE) groups[key].available += qty;
            if (m.status === MaterialStatus.CHECKED_OUT) groups[key].checkedOut += qty;
            if (m.status === MaterialStatus.MAINTENANCE) groups[key].maintenance += qty;
        });
        return groups;
    };

    let text = "";
    
    text += "a) MATERIAL BÉLICO:\n";
    const weapons = getStats(MaterialCategory.WEAPON);
    if(Object.keys(weapons).length === 0) text += "Nenhum armamento cadastrado.\n";
    Object.keys(weapons).forEach((name, idx) => {
        const s = weapons[name];
        text += `${name.toUpperCase()}:\n   RETIDAS: ${s.available}\n   CAUTELADAS: ${s.checkedOut}\n   MANUTENÇÃO: ${s.maintenance}\n   TOTAL: ${s.total}\n\n`;
    });

    text += "b) MATERIAL DE COMUNICAÇÃO:\nHT:\n";
    const radios = getStats(MaterialCategory.RADIO);
    let rStats = {res:0, caut:0, maint:0};
    Object.values(radios).forEach(s => {rStats.res += s.available; rStats.caut += s.checkedOut; rStats.maint += s.maintenance;});
    text += `RESERVA: ${rStats.res}\nCAUTELADOS: ${rStats.caut}\nDEFEITOS: ${rStats.maint}\n\n`;

    text += "c) MATERIAL DE PROTEÇÃO BALÍSTICA:\nCOLETES BALÍSTICOS:\n";
    const vests = getStats(MaterialCategory.VEST);
    let vTotal = 0;
    Object.values(vests).forEach(s => vTotal += s.total);
    text += `TOTAL: ${vTotal}\n\n`;

    text += "d) MATERIAL DE SINALIZAÇÃO:\nSem alterações.\n\n";

    text += "e) MATERIAIS DIVERSOS:\nChaves da reserva; Livro de Cautela; Livro de Alterações; Móveis e Utensílios; Ar Condicionado; Bebedouro.";
    setPart3Text(text);
  };

  const startNewReport = () => {
    setCurrentPartId(Date.now().toString());
    setIsDraft(true);
    setDateVisto(''); 
    setFiscalName(''); 
    setCrpm(''); 
    setBpm(''); 
    setCity('FORTALEZA');
    
    // DATAS AUTOMÁTICAS: hoje e amanhã
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    setIntroDateStart(today.toISOString().split('T')[0]);
    setIntroDateEnd(tomorrow.toISOString().split('T')[0]);
    setSignDate(today.toISOString().split('T')[0]);
    
    setSchedule([
      { 
        grad: armorer?.rank || 'CB', 
        num: armorer?.numeral || armorer?.matricula || '30671015', 
        name: armorer?.warName || armorer?.name || 'WILLIAM SIQUEIRA', 
        func: 'Armeiro', 
        horario: '07h-07h' 
      }
    ]);
    
    setPart2Text('Sem alterações.'); 
    setPart4Text('Sem alterações a registrar.');
    generateInventoryText();
    setSubstituteName(''); 
    setSignature(null);
    setShowScheduleEditor(false);
    setMode('EDITOR');
  };

  const handleSave = (status: 'DRAFT' | 'FINAL') => {
    if (!currentPartId || !armorer) return;
    if (status === 'FINAL' && !signature) { 
      alert("Assinatura digital obrigatória."); 
      return; 
    }
    
    const authName = `${armorer.name} ${armorer.rank ? `- ${armorer.rank}` : ''}`;
    
    const newPart: DailyPart = {
        id: currentPartId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorId: armorer.matricula,
        authorName: authName,
        status: status,
        signature: signature || undefined,
        content: {
            header: { 
              fiscal: fiscalName, 
              dateVisto, 
              crpm, 
              bpm, 
              city 
            },
            intro: { 
              bpm, 
              dateStart: introDateStart, 
              dateEnd: introDateEnd
            },
            part1: schedule,
            part2: part2Text,
            part3: part3Text,
            part4: part4Text,
            part5: { 
              substitute: substituteName, 
              city: signCity, 
              date: signDate
            }
        }
    };
    
    StorageService.saveDailyPart(newPart);
    loadHistory();
    alert(status === 'DRAFT' ? "Salvo como rascunho." : "Finalizado!");
    if(status === 'FINAL') setMode('LIST');
  };

  const exportDoc = (type: 'word' | 'pdf') => {
      if (!armorer) return;
      
      const authName = `${armorer.name} ${armorer.rank ? `- ${armorer.rank}` : ''}`;
      
      // DEBUG: Verificar as datas antes da exportação
      console.log('DEBUG - Datas para exportação:', {
        introDateStart,
        introDateEnd, 
        signDate,
        formattedStart: formatDateForExport(introDateStart, true),
        formattedEnd: formatDateForExport(introDateEnd, true),
        formattedSign: formatDateForExport(signDate, false)
      });
      
      // Cria um objeto com as datas JÁ FORMATADAS para exportação
      const exportContent = {
          header: { 
            fiscal: fiscalName, 
            dateVisto: dateVisto || '___', 
            crpm, 
            bpm, 
            city 
          },
          intro: { 
            bpm, 
            // Usa a função específica para exportação
            dateStart: formatDateForExport(introDateStart, true),
            dateEnd: formatDateForExport(introDateEnd, true)
          },
          part1: schedule,
          part2: part2Text,
          part3: part3Text,
          part4: part4Text,
          part5: { 
            substitute: substituteName, 
            city: signCity, 
            // Usa a função específica para exportação
            date: formatDateForExport(signDate, false)
          }
      };

      const exportData: DailyPart = {
        id: currentPartId || 'temp',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorId: armorer.matricula,
        authorName: authName,
        status: isDraft ? 'DRAFT' : 'FINAL',
        signature: signature || undefined,
        content: exportContent
      };

      if(type === 'word') {
        DocumentService.generateWord(exportData);
      } else {
        DocumentService.generatePDF(exportData);
      }
  };

  if (mode === 'LIST') {
      return (
          <div className="p-6 space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">LIVRO DE ALTERAÇÕES</h2>
                  <button onClick={startNewReport} className="flex items-center gap-2 bg-police-600 text-white px-4 py-2 rounded-lg hover:bg-police-700 font-medium">
                    <Plus size={20}/> GERAR NOVA PARTE
                  </button>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
                          <tr>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Armeiro</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Ação</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {history.map(part => (
                             <tr key={part.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                 <td className="px-6 py-4">{formatDateLong(part.content.intro.dateStart, true)}</td>
                                 <td className="px-6 py-4">{part.authorName}</td>
                                 <td className="px-6 py-4">
                                   <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                     part.status==='FINAL'?'bg-green-100 text-green-800':'bg-amber-100 text-amber-800'
                                   }`}>
                                     {part.status==='FINAL'?'Finalizado':'Rascunho'}
                                   </span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                   <button onClick={() => { 
                                     setCurrentPartId(part.id); 
                                     setIsDraft(part.status==='DRAFT'); 
                                     setFiscalName(part.content.header.fiscal); 
                                     setDateVisto(part.content.header.dateVisto); 
                                     setCrpm(part.content.header.crpm); 
                                     setBpm(part.content.header.bpm); 
                                     setCity(part.content.header.city); 
                                     setIntroDateStart(part.content.intro.dateStart); 
                                     setIntroDateEnd(part.content.intro.dateEnd); 
                                     setSchedule(part.content.part1); 
                                     setPart2Text(part.content.part2); 
                                     setPart3Text(part.content.part3); 
                                     setPart4Text(part.content.part4); 
                                     setSubstituteName(part.content.part5.substitute); 
                                     setSignCity(part.content.part5.city); 
                                     setSignDate(part.content.part5.date); 
                                     setSignature(part.signature || null); 
                                     setMode('EDITOR'); 
                                   }} className="text-blue-600 hover:underline flex items-center justify-end gap-1 w-full">
                                     <Edit3 size={16}/> Abrir
                                   </button>
                                 </td>
                             </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  }

  return (
      <div className="p-6 space-y-6 animate-fade-in min-h-screen bg-slate-100 dark:bg-slate-900">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm sticky top-0 z-10">
              <button onClick={() => setMode('LIST')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700">
                <ArrowLeft size={20}/> Voltar
              </button>
              <div className="flex gap-2">
                  <button onClick={generateInventoryText} className="px-3 py-2 text-xs bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 flex items-center gap-1">
                    <RefreshCw size={14}/> Reset Estoque
                  </button>
                  <button onClick={() => handleSave('DRAFT')} className="px-4 py-2 bg-amber-100 text-amber-800 rounded font-medium flex items-center gap-2">
                    <Save size={18}/> Rascunho
                  </button>
                  <button onClick={() => exportDoc('word')} className="px-4 py-2 bg-blue-600 text-white rounded font-medium flex items-center gap-2">
                    <FileText size={18}/> Word ABNT
                  </button>
                  <button onClick={() => exportDoc('pdf')} className="px-4 py-2 bg-red-600 text-white rounded font-medium flex items-center gap-2">
                    <Printer size={18}/> PDF ABNT
                  </button>
                  {isDraft && (
                    <button onClick={() => handleSave('FINAL')} className="px-4 py-2 bg-green-600 text-white rounded font-medium flex items-center gap-2">
                      <CheckCircle size={18}/> Finalizar
                    </button>
                  )}
              </div>
          </div>

          <div className="flex justify-center pb-20 pt-4">
              <div className="bg-white text-black w-[210mm] min-h-[297mm] p-[20mm] shadow-xl" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.5' }}>
                  
                  {/* TITLE */}
                  <div className="text-center font-bold mb-6 text-lg">LIVRO DE ALTERAÇÕES</div>

                  {/* HEADER */}
                  <table className="w-full border-collapse border border-black mb-6">
                    <tbody>
                      <tr>
                        <td className="w-[30%] border border-black p-2 align-top text-center">
                          <div className="text-xs font-bold">VISTO POR ALTERAÇÃO</div>
                          <input 
                            type="date" 
                            className="w-32 text-center border-b border-black outline-none text-sm my-2" 
                            value={dateVisto} 
                            onChange={e => setDateVisto(e.target.value)}
                          />
                          <div className="mt-4 pt-1">
                            <input 
                              type="text" 
                              className="w-full text-center font-bold text-xs uppercase outline-none" 
                              placeholder="NOME FISCAL" 
                              value={fiscalName} 
                              onChange={e => setFiscalName(e.target.value)}
                            />
                            <div className="text-xs font-bold">RESPONSÁVEL</div>
                          </div>
                        </td>
                        <td className="w-[70%] border border-black p-2 text-center align-middle">
                          <div className="font-bold uppercase">POLÍCIA MILITAR DO CEARÁ</div>
                          <div className="flex justify-center gap-2 my-1 text-xs font-bold">
                            <input 
                              type="text" 
                              className="w-20 text-center border-b border-black outline-none uppercase" 
                              placeholder="CRPM" 
                              value={crpm} 
                              onChange={e => setCrpm(e.target.value)}
                            />
                            <span>CRPM</span>
                            <input 
                              type="text" 
                              className="w-20 text-center border-b border-black outline-none uppercase" 
                              placeholder="BPM" 
                              value={bpm} 
                              onChange={e => setBpm(e.target.value)}
                            />
                            <span>BPM</span>
                            <input 
                              type="text" 
                              className="w-32 text-center border-b border-black outline-none uppercase" 
                              placeholder="CIDADE" 
                              value={city} 
                              onChange={e => setCity(e.target.value)}
                            />
                          </div>
                          <div className="font-bold underline uppercase mt-2">RESERVA DE ARMAMENTO</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                 {/* INTRODUÇÃO COM DATAS POR EXTENSO E DIAS DA SEMANA - FORMATO CORRETO */}
<div className="text-justify mb-6 text-sm">
  Parte diária do armeiro do <span className="font-bold uppercase">{bpm || '___'}</span> batalhão do dia {' '}
  <span className="font-bold">
    {formatDateLong(introDateStart, true)}
  </span>
  {' '}para o dia{' '}
  <span className="font-bold">
    {formatDateLong(introDateEnd, true)}
  </span>
  , ao Senhor Fiscal Administrativo.
                    
                    {/* Inputs de data para edição - mantidos escondidos mas acessíveis */}
                    <div className="mt-2 text-xs text-gray-500 flex gap-4 justify-center">
                      <label className="flex items-center gap-2">
                        <Calendar size={12} />
                        Data inicial: 
                        <input
                          type="date"
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                          value={introDateStart}
                          onChange={e => setIntroDateStart(e.target.value)}
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <Calendar size={12} />
                        Data final: 
                        <input
                          type="date"
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                          value={introDateEnd}
                          onChange={e => setIntroDateEnd(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* ESCALA DE SERVIÇO */}
                  <div className="mb-6">
                    <div className="text-center font-bold mb-2 uppercase">I – PARTE: ESCALA DE SERVIÇO</div>
                    
                    <button 
                      onClick={() => setShowScheduleEditor(!showScheduleEditor)}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mb-2 flex items-center gap-1"
                    >
                      <Edit3 size={12}/> {showScheduleEditor ? 'Visualizar' : 'Editar'} Escala
                    </button>

                    {showScheduleEditor ? (
                      // Tabela editável
                      <table className="w-full border-collapse border border-black text-center text-sm">
                        <thead>
                          <tr>
                            <th className="border border-black bg-gray-100 p-1">GRAD</th>
                            <th className="border border-black bg-gray-100 p-1">Nº</th>
                            <th className="border border-black bg-gray-100 p-1">NOME</th>
                            <th className="border border-black bg-gray-100 p-1">FUNÇÃO</th>
                            <th className="border border-black bg-gray-100 p-1">HORÁRIO</th>
                            <th className="border border-black bg-gray-100 p-1 w-8">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedule.map((row, idx) => (
                            <tr key={idx}>
                              <td className="border border-black p-0">
                                <input 
                                  className="w-full text-center p-1 outline-none font-serif" 
                                  value={row.grad} 
                                  onChange={e => {
                                    const n = [...schedule];
                                    n[idx].grad = e.target.value;
                                    setSchedule(n);
                                  }}
                                />
                              </td>
                              <td className="border border-black p-0">
                                <input 
                                  className="w-full text-center p-1 outline-none font-serif" 
                                  value={row.num} 
                                  onChange={e => {
                                    const n = [...schedule];
                                    n[idx].num = e.target.value;
                                    setSchedule(n);
                                  }}
                                />
                              </td>
                              <td className="border border-black p-0">
                                <input 
                                  className="w-full text-center p-1 outline-none font-serif" 
                                  value={row.name} 
                                  onChange={e => {
                                    const n = [...schedule];
                                    n[idx].name = e.target.value;
                                    setSchedule(n);
                                  }}
                                />
                              </td>
                              <td className="border border-black p-0">
                                <input 
                                  className="w-full text-center p-1 outline-none font-serif" 
                                  value={row.func} 
                                  onChange={e => {
                                    const n = [...schedule];
                                    n[idx].func = e.target.value;
                                    setSchedule(n);
                                  }}
                                />
                              </td>
                              <td className="border border-black p-0">
                                <input 
                                  className="w-full text-center p-1 outline-none font-serif" 
                                  value={row.horario} 
                                  onChange={e => {
                                    const n = [...schedule];
                                    n[idx].horario = e.target.value;
                                    setSchedule(n);
                                  }}
                                />
                              </td>
                              <td className="border border-black p-0 text-center">
                                <button 
                                  onClick={() => {
                                    const n = [...schedule];
                                    n.splice(idx, 1);
                                    setSchedule(n);
                                  }} 
                                  className="text-red-500 hover:bg-red-50 p-1"
                                >
                                  <Trash2 size={14}/>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      // Tabela para visualização/exportação - CORRIGIDA
                      <table className="w-full border-collapse border border-black text-center text-sm">
                        <thead>                     
                          <tr>
                            <th className="border border-black bg-gray-100 p-1">GRAD</th>
                            <th className="border border-black bg-gray-100 p-1">Nº</th>
                            <th className="border border-black bg-gray-100 p-1">NOME</th>
                            <th className="border border-black bg-gray-100 p-1">FUNÇÃO</th>
                            <th className="border border-black bg-gray-100 p-1">HORÁRIO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedule.map((row, idx) => (
                            <tr key={idx}>
                              <td className="border border-black p-1 font-serif">{row.grad || '-'}</td>
                              <td className="border border-black p-1 font-serif">{row.num || ''}</td>
                              <td className="border border-black p-1 font-serif">{row.name || ''}</td>
                              <td className="border border-black p-1 font-serif">{row.func || ''}</td>
                              <td className="border border-black p-1 font-serif">{row.horario || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    
                    <button 
                      onClick={() => setSchedule([...schedule, {grad:'', num:'', name:'', func:'', horario:''}])} 
                      className="text-xs text-blue-600 flex items-center gap-1 mt-1 hover:underline"
                    >
                      <Plus size={12}/> Adicionar Linha
                    </button>
                  </div>

                  {/* PARTE II - INSTRUÇÃO */}
                  <div className="mb-6">
                    <div className="text-center font-bold mb-2 uppercase">II – PARTE: INSTRUÇÃO</div>
                    <textarea 
                      className="w-full border-none outline-none resize-none font-serif text-[12pt] leading-normal" 
                      rows={2} 
                      value={part2Text} 
                      onChange={e => setPart2Text(e.target.value)}
                    />
                  </div>

                  {/* PARTE III - ASSUNTOS GERAIS/ADMINISTRATIVOS */}
                  <div className="mb-6">
                    <div className="text-center font-bold mb-2 uppercase">III – PARTE: ASSUNTOS GERAIS/ADMINISTRATIVOS</div>
                    <textarea 
                      className="w-full border-none outline-none resize-none font-serif text-[11pt] leading-normal min-h-[300px]" 
                      value={part3Text} 
                      onChange={e => setPart3Text(e.target.value)}
                      style={{ whiteSpace: 'pre-line' }}
                    />
                  </div>

                  {/* PARTE IV - OCORRÊNCIAS */}
                  <div className="mb-6">
                    <div className="text-center font-bold mb-1 uppercase">IV – PARTE: OCORRÊNCIAS</div>
                    <div className="text-left mb-2 text-sm">Comunico-vos que:</div>
                    <textarea 
                      className="w-full border-none outline-none resize-none font-serif text-[12pt] leading-normal min-h-[80px]" 
                      value={part4Text} 
                      onChange={e => setPart4Text(e.target.value)}
                    />
                  </div>

                  {/* PARTE V - PASSAGEM DE SERVIÇO - FORMATO CORRETO: "Cidade, dia de mês de ano" */}
                  <div className="mt-8">
                    <div className="text-center font-bold mb-4 uppercase">
                      V – PARTE: PASSAGEM DE SERVIÇO
                    </div>

                    <div className="text-justify mb-8 text-sm">
  FI-LA AO MEU SUBSTITUTO LEGAL, O{' '}
  <input
    className="border-b border-black w-64 text-center outline-none font-bold uppercase mx-1 font-serif"
    placeholder="GRADUAÇÃO / NOME"
    value={substituteName}
    onChange={e => setSubstituteName(e.target.value)}
  />,{' '}
  A QUEM TRANSMITI TODAS AS ORDENS EM VIGOR, BEM COMO TODO MATERIAL A MEU CARGO.
                    </div>

                    {/* FORMATO: Cidade, dia de mês de ano (SEM dia da semana) */}
                    <div className="text-center mb-8 uppercase font-bold">
                      <input
                        className="border-b border-black w-40 text-center outline-none uppercase font-serif font-bold"
                        placeholder="CIDADE"
                        value={signCity}
                        onChange={e => setSignCity(e.target.value)}
                      />
                      {', '}
                      <span className="px-2 font-serif">
                        {/* DATA POR EXTENSO SEM DIA DA SEMANA - SEM SUBLINHADO */}
                        {formatDateLong(signDate, false)}
                      </span>
                      
                      {/* Input para edição da data - agora visível para facilitar */}
                      <div className="mt-2 text-xs text-gray-500">
                        <label className="flex items-center justify-center gap-2">
                          <Calendar size={14} />
                          Alterar data: 
                          <input
                            type="date"
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                            value={signDate}
                            onChange={e => setSignDate(e.target.value)}
                          />
                        </label>
                      </div>
                    </div>

                    {/* ASSINATURA */}
                    <div className="flex flex-col items-center mt-12">
                      <div className="mb-2 h-16 flex items-end justify-center w-full">
                        {signature ? (
                          <img src={signature} alt="Assinatura" className="h-12 object-contain" />
                        ) : (
                          <div className="text-center">
                            <div className="text-gray-400 italic text-sm border-b border-gray-400 w-64 pb-1">
                              Assinatura Digital
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ___________________________________
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-center">
                        <div className="font-bold uppercase text-sm">
                          {armorer?.name || 'NOME DO ARMEIRO'}
                        </div>
                        <div className="uppercase text-xs">MAT: {armorer?.matricula || '000000'}</div>
                      </div>

                      <div className="mt-4 w-full max-w-sm">
                        {!signature ? (
                          <SignaturePad onSave={setSignature} label="Assinar Agora" />
                        ) : (
                          <button
                            onClick={() => setSignature(null)}
                            className="text-xs text-red-500 hover:underline mt-2 w-full text-center"
                          >
                            Limpar Assinatura
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
              </div>
          </div>
      </div>
  );
};

export default DailyBookPage;
