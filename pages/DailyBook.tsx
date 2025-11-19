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
  
  // Editor State
  const [currentPartId, setCurrentPartId] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(true);
  
  // --- FORM STATES ---
  const [dateVisto, setDateVisto] = useState('');
  const [fiscalName, setFiscalName] = useState('');
  const [crpm, setCrpm] = useState('');
  const [bpm, setBpm] = useState('');
  const [city, setCity] = useState('FORTALEZA');
  
  const [introDateStart, setIntroDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [introDateEnd, setIntroDateEnd] = useState(new Date().toISOString().split('T')[0]);

  const [schedule, setSchedule] = useState<DailyPartSchedule[]>([
      { grad: '', num: '', name: '', func: 'Armeiro', horario: '07h-07h' },
      { grad: '', num: '', name: '', func: 'Auxiliar', horario: '07h-19h' },
      { grad: '', num: '', name: '', func: '', horario: '' },
      { grad: '', num: '', name: '', func: '', horario: '' }
  ]);

  const [part2Text, setPart2Text] = useState('Sem alterações.');
  const [part3Text, setPart3Text] = useState('');
  const [part4Text, setPart4Text] = useState('Sem alterações a registrar.');

  const [substituteName, setSubstituteName] = useState('');
  const [signCity, setSignCity] = useState('FORTALEZA');
  const [signDate, setSignDate] = useState(new Date().toISOString().split('T')[0]);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = () => setHistory(StorageService.getDailyParts());

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

    let text = "Sem alterações administrativas.\n\n";
    
    text += "1) MATERIAL BÉLICO:\n";
    const weapons = getStats(MaterialCategory.WEAPON);
    if(Object.keys(weapons).length === 0) text += "Nenhum armamento cadastrado.\n";
    Object.keys(weapons).forEach((name, idx) => {
        const s = weapons[name];
        text += `${name.toUpperCase()}:\n   RETIDAS: ${s.available}\n   CAUTELADAS: ${s.checkedOut}\n   MANUTENÇÃO: ${s.maintenance}\n   TOTAL: ${s.total}\n\n`;
    });

    text += "2) MATERIAL DE COMUNICAÇÃO:\nHT:\n";
    const radios = getStats(MaterialCategory.RADIO);
    let rStats = {res:0, caut:0, maint:0};
    Object.values(radios).forEach(s => {rStats.res += s.available; rStats.caut += s.checkedOut; rStats.maint += s.maintenance;});
    text += `RESERVA: ${rStats.res}\nCAUTELADOS: ${rStats.caut}\nDEFEITOS: ${rStats.maint}\n\n`;

    text += "3) MATERIAL DE PROTEÇÃO BALÍSTICA:\nCOLETES BALÍSTICOS:\n";
    const vests = getStats(MaterialCategory.VEST);
    let vTotal = 0;
    Object.values(vests).forEach(s => vTotal += s.total);
    text += `TOTAL: ${vTotal}\n\n`;

    text += "4) MATERIAL DE SINALIZAÇÃO:\nSem alterações.\n\n";

    text += "5) MATERIAIS DIVERSOS:\nChaves da reserva; Livro de Cautela; Livro de Alterações; Móveis e Utensílios; Ar Condicionado; Bebedouro.";
    setPart3Text(text);
  };

  const startNewReport = () => {
    setCurrentPartId(Date.now().toString());
    setIsDraft(true);
    setDateVisto(''); setFiscalName(''); setCrpm(''); setBpm(''); setCity('FORTALEZA');
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
    setIntroDateStart(today.toISOString().split('T')[0]);
    setIntroDateEnd(tomorrow.toISOString().split('T')[0]);
    setSignDate(today.toISOString().split('T')[0]);
    setSchedule([{ grad: armorer?.rank || '-', num: armorer?.numeral || armorer?.matricula || '', name: armorer?.warName || armorer?.name || '', func: 'Armeiro', horario: '07h-07h' }]);
    setPart2Text('Sem alterações.'); setPart4Text('Sem alterações a registrar.');
    generateInventoryText();
    setSubstituteName(''); setSignature(null);
    setMode('EDITOR');
  };

  const handleSave = (status: 'DRAFT' | 'FINAL') => {
    if (!currentPartId || !armorer) return;
    if (status === 'FINAL' && !signature) { alert("Assinatura digital obrigatória."); return; }
    
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
            header: { fiscal: fiscalName, dateVisto, crpm, bpm, city },
            intro: { bpm, dateStart: introDateStart, dateEnd: introDateEnd },
            part1: schedule,
            part2: part2Text,
            part3: part3Text,
            part4: part4Text,
            part5: { substitute: substituteName, city: signCity, date: signDate }
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
      const data: DailyPart = {
        id: currentPartId || 'temp',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorId: armorer.matricula,
        authorName: authName,
        status: isDraft ? 'DRAFT' : 'FINAL',
        signature: signature || undefined,
        content: {
            header: { fiscal: fiscalName, dateVisto, crpm, bpm, city },
            intro: { bpm, dateStart: introDateStart, dateEnd: introDateEnd },
            part1: schedule,
            part2: part2Text,
            part3: part3Text,
            part4: part4Text,
            part5: { substitute: substituteName, city: signCity, date: signDate }
        }
      };

      if(type === 'word') DocumentService.generateWord(data);
      else DocumentService.generatePDF(data);
  };

  if (mode === 'LIST') {
      return (
          <div className="p-6 space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">LIVRO DE ALTERAÇÕES</h2>
                  <button onClick={startNewReport} className="flex items-center gap-2 bg-police-600 text-white px-4 py-2 rounded-lg hover:bg-police-700 font-medium"><Plus size={20}/> GERAR NOVA PARTE</button>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
                          <tr><th className="px-6 py-4">Data</th><th className="px-6 py-4">Armeiro</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ação</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {history.map(part => (
                             <tr key={part.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                 <td className="px-6 py-4">{new Date(part.content.intro.dateStart).toLocaleDateString('pt-BR')}</td>
                                 <td className="px-6 py-4">{part.authorName}</td>
                                 <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${part.status==='FINAL'?'bg-green-100 text-green-800':'bg-amber-100 text-amber-800'}`}>{part.status==='FINAL'?'Finalizado':'Rascunho'}</span></td>
                                 <td className="px-6 py-4 text-right"><button onClick={() => { setCurrentPartId(part.id); setIsDraft(part.status==='DRAFT'); setFiscalName(part.content.header.fiscal); setDateVisto(part.content.header.dateVisto); setCrpm(part.content.header.crpm); setBpm(part.content.header.bpm); setCity(part.content.header.city); setIntroDateStart(part.content.intro.dateStart); setIntroDateEnd(part.content.intro.dateEnd); setSchedule(part.content.part1); setPart2Text(part.content.part2); setPart3Text(part.content.part3); setPart4Text(part.content.part4); setSubstituteName(part.content.part5.substitute); setSignCity(part.content.part5.city); setSignDate(part.content.part5.date); setSignature(part.signature || null); setMode('EDITOR'); }} className="text-blue-600 hover:underline flex items-center justify-end gap-1 w-full"><Edit3 size={16}/> Abrir</button></td>
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
              <button onClick={() => setMode('LIST')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700"><ArrowLeft size={20}/> Voltar</button>
              <div className="flex gap-2">
                  <button onClick={generateInventoryText} className="px-3 py-2 text-xs bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 flex items-center gap-1"><RefreshCw size={14}/> Reset Estoque</button>
                  <button onClick={() => handleSave('DRAFT')} className="px-4 py-2 bg-amber-100 text-amber-800 rounded font-medium flex items-center gap-2"><Save size={18}/> Rascunho</button>
                  <button onClick={() => exportDoc('word')} className="px-4 py-2 bg-blue-600 text-white rounded font-medium flex items-center gap-2"><FileText size={18}/> Word ABNT</button>
                  <button onClick={() => exportDoc('pdf')} className="px-4 py-2 bg-red-600 text-white rounded font-medium flex items-center gap-2"><Printer size={18}/> PDF ABNT</button>
                  {isDraft && <button onClick={() => handleSave('FINAL')} className="px-4 py-2 bg-green-600 text-white rounded font-medium flex items-center gap-2"><CheckCircle size={18}/> Finalizar</button>}
              </div>
          </div>

          <div className="flex justify-center pb-20 pt-4">
              <div className="bg-white text-black w-[210mm] min-h-[297mm] p-[20mm] shadow-xl" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.5' }}>
                  
                  {/* TITLE */}
                  <div className="text-center font-bold mb-4 text-lg">LIVRO DE ALTERAÇÕES</div>

                  {/* HEADER */}
                  <table className="w-full border-collapse border border-black mb-6"><tbody><tr>
                      <td className="w-[35%] border border-black p-2 align-top text-center">
                          <div className="text-xs font-bold">VISTO EM:</div>
                          <input type="date" className="w-32 text-center border-b border-black outline-none text-sm my-2" value={dateVisto} onChange={e => setDateVisto(e.target.value)}/>
                          <div className="mt-4 pt-1"><input type="text" className="w-full text-center font-bold text-xs uppercase outline-none" placeholder="NOME FISCAL" value={fiscalName} onChange={e => setFiscalName(e.target.value)}/><div className="text-xs font-bold">FISCAL ADMIN</div></div>
                      </td>
                      <td className="w-[65%] border border-black p-2 text-center align-middle">
                          <div className="font-bold uppercase">POLÍCIA MILITAR DO CEARÁ</div>
                          <div className="flex justify-center gap-2 my-1 text-xs font-bold"><input type="text" className="w-12 text-center border-b border-black outline-none uppercase" placeholder="___" value={crpm} onChange={e => setCrpm(e.target.value)}/><span>CRPM</span></div>
                          <div className="flex justify-center gap-2 mb-2 text-xs font-bold"><input type="text" className="w-12 text-center border-b border-black outline-none uppercase" placeholder="___" value={bpm} onChange={e => setBpm(e.target.value)}/><span>BPM</span><span>----------</span><input type="text" className="w-32 text-center border-b border-black outline-none uppercase" placeholder="CIDADE" value={city} onChange={e => setCity(e.target.value)}/></div>
                          <div className="font-bold underline uppercase mt-2">RESERVA DE ARMAMENTO</div>
                      </td>
                  </tr></tbody></table>

                  <div className="text-left mb-6">Parte diária do armeiro do <span className="font-bold uppercase">{bpm || '___'}</span> batalhão do dia <input type="date" className="mx-2 w-32 border-b border-black outline-none text-center" value={introDateStart} onChange={e => setIntroDateStart(e.target.value)}/> para o dia <input type="date" className="mx-2 w-32 border-b border-black outline-none text-center" value={introDateEnd} onChange={e => setIntroDateEnd(e.target.value)}/>, ao Senhor Fiscal Administrativo.</div>

                  <div className="mb-6"><div className="text-center font-bold mb-2 uppercase">I – PARTE: ESCALA DE SERVIÇO</div>
                      <table className="w-full border-collapse border border-black text-center text-sm"><thead><tr><th className="border border-black bg-gray-100 p-1">GRAD</th><th className="border border-black bg-gray-100 p-1">Nº</th><th className="border border-black bg-gray-100 p-1 w-[40%]">NOME</th><th className="border border-black bg-gray-100 p-1">FUNÇÃO</th><th className="border border-black bg-gray-100 p-1">HORÁRIO</th><th className="border border-black bg-gray-100 p-1 w-8"></th></tr></thead>
                      <tbody>{schedule.map((row, idx) => (<tr key={idx}><td className="border border-black p-0"><input className="w-full text-center p-1 outline-none font-serif" value={row.grad} onChange={e => {const n=[...schedule];n[idx].grad=e.target.value;setSchedule(n)}}/></td><td className="border border-black p-0"><input className="w-full text-center p-1 outline-none font-serif" value={row.num} onChange={e => {const n=[...schedule];n[idx].num=e.target.value;setSchedule(n)}}/></td><td className="border border-black p-0"><input className="w-full text-center p-1 outline-none font-serif" value={row.name} onChange={e => {const n=[...schedule];n[idx].name=e.target.value;setSchedule(n)}}/></td><td className="border border-black p-0"><input className="w-full text-center p-1 outline-none font-serif" value={row.func} onChange={e => {const n=[...schedule];n[idx].func=e.target.value;setSchedule(n)}}/></td><td className="border border-black p-0"><input className="w-full text-center p-1 outline-none font-serif" value={row.horario} onChange={e => {const n=[...schedule];n[idx].horario=e.target.value;setSchedule(n)}}/></td><td className="border border-black p-0 text-center"><button onClick={() => {const n=[...schedule];n.splice(idx,1);setSchedule(n)}} className="text-red-500 hover:bg-red-50 p-1"><Trash2 size={14}/></button></td></tr>))}</tbody></table>
                      <button onClick={() => setSchedule([...schedule, {grad:'',num:'',name:'',func:'',horario:''}])} className="text-xs text-blue-600 flex items-center gap-1 mt-1"><Plus size={12}/> Adicionar Linha</button>
                  </div>

                  <div className="mb-6"><div className="text-center font-bold mb-2 uppercase">II – PARTE: INSTRUÇÃO</div><textarea className="w-full border-none outline-none resize-none font-serif text-[12pt] leading-normal text-left" rows={3} value={part2Text} onChange={e => setPart2Text(e.target.value)}/></div>
                  <div className="mb-6"><div className="text-center font-bold mb-2 uppercase">III – PARTE: ASSUNTOS GERAIS/ADMINISTRATIVOS</div><textarea className="w-full border-none outline-none resize-none font-serif text-[11pt] leading-normal min-h-[400px] text-left" value={part3Text} onChange={e => setPart3Text(e.target.value)}/></div>
                  <div className="mb-6"><div className="text-center font-bold mb-1 uppercase">IV – PARTE: OCORRÊNCIAS</div><div className="text-left mb-2 text-sm">Comunico-vos que:</div><textarea className="w-full border-none outline-none resize-none font-serif text-[12pt] leading-normal min-h-[100px] text-left" value={part4Text} onChange={e => setPart4Text(e.target.value)}/></div>

                  <div className="mt-8"><div className="text-center font-bold mb-4 uppercase">V – PARTE: PASSAGEM DE SERVIÇO</div>
                      <div className="text-left mb-8">FI-LA AO MEU SUBSTITUTO LEGAL, O <input className="border-b border-black w-64 text-center outline-none font-bold uppercase mx-1 font-serif" placeholder="GRADUAÇÃO / NOME" value={substituteName} onChange={e => setSubstituteName(e.target.value)}/>, A QUEM TRANSMITI TODAS AS ORDENS EM VIGOR, BEM COMO TODO MATERIAL A MEU CARGO.</div>
                      <div className="text-center mb-12 uppercase font-bold"><input className="border-b border-black w-40 text-center outline-none uppercase font-serif font-bold" value={signCity} onChange={e => setSignCity(e.target.value)}/>, <input type="date" className="mx-2 border-b border-black outline-none text-center" value={signDate} onChange={e => setSignDate(e.target.value)}/></div>
                      <div className="flex flex-col items-center">
                          <div className="mb-2 h-16 flex items-end justify-center w-full">{signature ? <img src={signature} alt="Assinatura" className="h-14 object-contain"/> : <span className="text-gray-300 italic text-sm border-b border-gray-300 w-64 text-center">Assinatura Digital</span>}</div>
                          <div className="border-t border-black w-2/3 pt-2 text-center"><div className="font-bold uppercase">{armorer?.name || 'NOME DO ARMEIRO'}</div><div className="uppercase">MAT: {armorer?.matricula || '000000'}</div></div>
                          <div className="mt-4 w-full max-w-sm">{!signature ? (<SignaturePad onSave={setSignature} label="Assinar Agora" />) : (<button onClick={() => setSignature(null)} className="text-xs text-red-500 hover:underline mt-2 w-full text-center">Limpar Assinatura</button>)}</div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
};