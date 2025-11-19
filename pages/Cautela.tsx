import React, { useState } from 'react';
import { Material, Personnel, Cautela, CautelaItem, MaterialCategory, MaterialStatus, Armorer } from '../types';
import { ArrowRightLeft, CheckCircle, Search, Plus, AlertCircle, X, PenTool, Eye, ChevronDown, ChevronUp, Info, Box } from 'lucide-react';
import { SignaturePad } from '../components/SignaturePad';

interface CautelaPageProps {
  materials: Material[];
  personnel: Personnel[];
  cautelas: Cautela[];
  armorer: Armorer | null;
  onUpdateCautelas: (data: Cautela[]) => void;
  onUpdateMaterials: (data: Material[]) => void;
  onLog: (action: string, details: string) => void;
}

export const CautelaPage: React.FC<CautelaPageProps> = ({ materials, personnel, cautelas, armorer, onUpdateCautelas, onUpdateMaterials, onLog }) => {
  const [view, setView] = useState<'LIST' | 'NEW' | 'RETURN'>('LIST');
  const [selectedCautela, setSelectedCautela] = useState<Cautela | null>(null);
  const [viewSignature, setViewSignature] = useState<string | null>(null);
  const [expandedCautelaId, setExpandedCautelaId] = useState<string | null>(null);

  // Form State for New Cautela
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [newItems, setNewItems] = useState<CautelaItem[]>([]);
  const [notesOut, setNotesOut] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [signatureOut, setSignatureOut] = useState<string | null>(null);
  
  // Return State
  const [signatureIn, setSignatureIn] = useState<string | null>(null);

  // State for category search inputs
  const [categorySearch, setCategorySearch] = useState<Record<string, string>>({});

  // Helpers for selection
  const availableMaterials = materials.filter(m => m.status === MaterialStatus.AVAILABLE);

  const filteredPersonnel = personnel.filter(p => 
    p.active && (
        p.name.toLowerCase().includes(personnelSearch.toLowerCase()) || 
        p.matricula.includes(personnelSearch) ||
        (p.warName && p.warName.toLowerCase().includes(personnelSearch.toLowerCase()))
    )
  );

  const selectedOfficer = personnel.find(p => p.id === selectedPersonnelId);

  const handleAddItem = (category: MaterialCategory, materialId: string) => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return;
    
    setNewItems([...newItems, {
        materialId: mat.id,
        serialNumber: mat.serialNumber,
        category: mat.category,
        quantity: 1 
    }]);
  };

  const handleUpdateQuantity = (index: number, qty: number) => {
    const items = [...newItems];
    items[index].quantity = qty > 0 ? qty : 1;
    setNewItems(items);
  };

  const handleRemoveItem = (index: number) => {
      const updated = [...newItems];
      updated.splice(index, 1);
      setNewItems(updated);
  };
  
  const handleCategorySearchChange = (category: string, value: string) => {
      setCategorySearch(prev => ({ ...prev, [category]: value }));
  };

  const toggleExpand = (id: string) => {
      setExpandedCautelaId(prev => prev === id ? null : id);
  };

  const handleSubmitCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonnelId || newItems.length === 0 || !armorer) {
        alert("Preencha todos os dados obrigatórios.");
        return;
    }

    if (!signatureOut) {
        alert("Assinatura digital obrigatória para confirmar a cautela.");
        return;
    }

    const officer = personnel.find(p => p.id === selectedPersonnelId);
    
    // Format: Rank Numeral WarName
    const officerDisplayName = officer 
        ? `${officer.rank} ${officer.numeral ? officer.numeral + ' ' : ''}${officer.warName || officer.name}` 
        : 'Desconhecido';

    const newCautela: Cautela = {
        id: Date.now().toString(),
        personnelId: selectedPersonnelId,
        personnelName: officerDisplayName, // Saving the formatted string here ensures the list view is correct
        armorerId: armorer.id,
        armorerName: armorer.name,
        items: newItems,
        timestampOut: new Date().toISOString(),
        status: 'OPEN',
        notesOut: notesOut,
        area: serviceArea || officer?.area,
        signatureOut: signatureOut
    };

    // Update Materials Status
    const updatedMaterials = materials.map(m => {
        if (newItems.some(item => item.materialId === m.id)) {
            if (m.category !== MaterialCategory.AMMO) {
                 return { ...m, status: MaterialStatus.CHECKED_OUT, personnelId: selectedPersonnelId };
            }
        }
        return m;
    });

    onUpdateMaterials(updatedMaterials);
    onUpdateCautelas([newCautela, ...cautelas]);
    onLog('Nova Cautela', `Saída de material para ${officerDisplayName}. ${newItems.length} itens.`);
    
    setView('LIST');
    setNewItems([]);
    setSelectedPersonnelId('');
    setPersonnelSearch('');
    setNotesOut('');
    setSignatureOut(null);
    setCategorySearch({});
  };

  const handleReturn = (cautela: Cautela) => {
      if (!armorer) return;

      const updatedMaterials = materials.map(m => {
          if (cautela.items.some(item => item.materialId === m.id)) {
              return { ...m, status: MaterialStatus.AVAILABLE, personnelId: undefined };
          }
          return m;
      });
      
      // Construct Full Armorer Name (Rank + Numeral + WarName or Name)
      const armorerDisplayName = `${armorer.rank || ''} ${armorer.numeral ? armorer.numeral + ' ' : ''}${armorer.warName || armorer.name}`.trim();

      const updatedCautelas = cautelas.map(c => c.id === cautela.id ? {
          ...c,
          status: 'CLOSED',
          timestampIn: new Date().toISOString(),
          armorerInId: armorer.id,
          armorerInName: armorerDisplayName, // Updated to include Rank/Numeral/WarName
          signatureIn: signatureIn || undefined
      } as Cautela : c);

      onUpdateMaterials(updatedMaterials);
      onUpdateCautelas(updatedCautelas);
      onLog('Devolução', `Material devolvido por ${cautela.personnelName} (Recebido por: ${armorerDisplayName})`);
      setSelectedCautela(null);
      setSignatureIn(null);
  };

  // Sub-components
  const renderNewCautelaForm = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm animate-fade-in">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Nova Saída de Material</h3>
            <button onClick={() => setView('LIST')} className="text-slate-500 hover:text-slate-700">Cancelar</button>
        </div>
        <form onSubmit={handleSubmitCheckout} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Policial Militar</label>
                    <div className="relative mb-2">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                         <input 
                            type="text" 
                            placeholder="Buscar policial (nome/matrícula/nome de guerra)..." 
                            className="w-full pl-9 p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 dark:text-white focus:ring-2 focus:ring-police-500 outline-none"
                            value={personnelSearch}
                            onChange={e => setPersonnelSearch(e.target.value)}
                         />
                    </div>
                    <select required className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent dark:text-white"
                        value={selectedPersonnelId} onChange={e => setSelectedPersonnelId(e.target.value)}>
                        <option value="">Selecione na lista...</option>
                        {filteredPersonnel.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.rank} {p.numeral ? p.numeral + ' ' : ''}{p.warName || p.name} ({p.matricula})
                            </option>
                        ))}
                        {selectedPersonnelId && !filteredPersonnel.find(p => p.id === selectedPersonnelId) && personnel.find(p => p.id === selectedPersonnelId) && (
                             <option value={selectedPersonnelId}>
                                {personnel.find(p => p.id === selectedPersonnelId)?.rank} {personnel.find(p => p.id === selectedPersonnelId)?.name}
                             </option>
                        )}
                    </select>
                </div>
                
                {/* Display Name of War (Auto-filled) */}
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Nome de Guerra (Automático)</label>
                    <input 
                        type="text" 
                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 dark:text-slate-300 cursor-not-allowed"
                        value={selectedOfficer?.warName || ''} 
                        readOnly
                        placeholder="Selecione o policial..." 
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 dark:text-white">Área de Atuação (Serviço)</label>
                    <input type="text" className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent dark:text-white"
                        value={serviceArea} onChange={e => setServiceArea(e.target.value)} placeholder="Ex: Setor Bravo, Patrulha..." />
                </div>
            </div>

            {/* Item Selection */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Adicionar Materiais</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {[MaterialCategory.WEAPON, MaterialCategory.VEST, MaterialCategory.RADIO, MaterialCategory.AMMO, MaterialCategory.CUFFS, MaterialCategory.MAGAZINE].map(cat => {
                        const searchTerm = categorySearch[cat] || '';
                        const filteredItems = availableMaterials.filter(m => 
                            m.category === cat && 
                            !newItems.find(ni => ni.materialId === m.id) &&
                            (m.model.toLowerCase().includes(searchTerm.toLowerCase()) || m.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
                        );

                        return (
                            <div key={cat} className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{cat}</label>
                                <div className="relative mb-2">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                    <input 
                                        type="text"
                                        placeholder="Filtrar..."
                                        className="w-full pl-7 p-1.5 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-police-500 outline-none"
                                        value={searchTerm}
                                        onChange={(e) => handleCategorySearchChange(cat, e.target.value)}
                                    />
                                </div>
                                <select className="w-full p-2 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white"
                                    onChange={(e) => {
                                        if(e.target.value) {
                                            handleAddItem(cat, e.target.value);
                                            e.target.value = ""; 
                                            handleCategorySearchChange(cat, ''); 
                                        }
                                    }}
                                >
                                    <option value="">+ Adicionar {cat}</option>
                                    {filteredItems.map(m => (
                                        <option key={m.id} value={m.id}>{m.model} - {m.serialNumber}</option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}
                </div>

                {newItems.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Itens Selecionados ({newItems.length})</h5>
                        <ul className="space-y-2">
                            {newItems.map((item, idx) => {
                                const isQuantityEditable = item.category === MaterialCategory.AMMO || item.category === MaterialCategory.MAGAZINE;
                                return (
                                    <li key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                                        <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">
                                            <span className="font-semibold">{item.category}:</span> {materials.find(m => m.id === item.materialId)?.model} ({item.serialNumber})
                                        </span>
                                        {isQuantityEditable && (
                                            <div className="flex items-center gap-2 mx-4">
                                                <label className="text-xs font-bold text-slate-500">QTD</label>
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value))}
                                                    className="w-20 p-1 text-center text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-police-500 outline-none"
                                                />
                                            </div>
                                        )}
                                        <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700"><X size={16}/></button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Observações</label>
                    <textarea className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent dark:text-white h-full min-h-[150px]"
                        value={notesOut} onChange={e => setNotesOut(e.target.value)}></textarea>
                </div>
                
                <div className="flex flex-col">
                    <SignaturePad onSave={setSignatureOut} required />
                    <p className="text-xs text-slate-400 mt-1">Assinatura obrigatória para confirmar a retirada.</p>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setView('LIST')} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-police-600 text-white rounded-lg hover:bg-police-700 font-medium">Confirmar Saída</button>
            </div>
        </form>
    </div>
  );

  const renderList = () => (
      <div className="space-y-4">
         <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Controle de Cautelas</h2>
            <button onClick={() => setView('NEW')} className="flex items-center gap-2 bg-police-600 text-white px-4 py-2 rounded-lg hover:bg-police-700 transition-colors font-medium">
                <Plus size={20} /> Nova Saída
            </button>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
                    <tr>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Policial</th>
                        <th className="px-6 py-4">Itens</th>
                        <th className="px-6 py-4">Saída</th>
                        <th className="px-6 py-4">Devolução</th>
                        <th className="px-6 py-4">Recebido Por</th>
                        <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {cautelas.map(c => (
                        <React.Fragment key={c.id}>
                            <tr className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${expandedCautelaId === c.id ? 'bg-slate-50 dark:bg-slate-900/20' : ''}`}>
                                <td className="px-6 py-4">
                                    {c.status === 'OPEN' ? 
                                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-1 rounded text-xs font-bold">ABERTO</span> : 
                                        <span className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 px-2 py-1 rounded text-xs font-bold">FECHADO</span>
                                    }
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{c.personnelName}</td>
                                <td className="px-6 py-4 cursor-pointer" onClick={() => toggleExpand(c.id)}>
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-police-600">
                                        <span className="text-xs">
                                            {c.items.length > 0 ? `${c.items[0].category} ${c.items.length > 1 ? `(+${c.items.length - 1})` : ''}` : 'Sem itens'}
                                        </span>
                                        {expandedCautelaId === c.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {new Date(c.timestampOut).toLocaleString('pt-BR')}
                                        {c.signatureOut && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setViewSignature(c.signatureOut!); }} 
                                                className="text-slate-400 hover:text-police-600" 
                                                title="Ver assinatura"
                                            >
                                                <PenTool size={12} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {c.timestampIn ? new Date(c.timestampIn).toLocaleString('pt-BR') : '-'}
                                        {c.signatureIn && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setViewSignature(c.signatureIn!); }} 
                                                className="text-slate-400 hover:text-police-600" 
                                                title="Ver assinatura"
                                            >
                                                <PenTool size={12} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                                    {c.armorerInName || '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {c.status === 'OPEN' ? (
                                        <button onClick={() => setSelectedCautela(c)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium text-xs border border-blue-200 dark:border-blue-800 px-3 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                            DEVOLVER
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-400 flex items-center justify-end gap-1"><CheckCircle size={12}/> OK</span>
                                    )}
                                </td>
                            </tr>
                            
                            {/* Expanded Details Row */}
                            {expandedCautelaId === c.id && (
                                <tr>
                                    <td colSpan={7} className="bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700 p-4">
                                        <div className="px-4">
                                            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-2"><Box size={12}/> Detalhamento do Material</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {c.items.map((item, idx) => {
                                                    const mat = materials.find(m => m.id === item.materialId);
                                                    return (
                                                        <div key={idx} className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 text-xs flex flex-col">
                                                            <span className="font-bold text-police-700 dark:text-police-400">{item.category}</span>
                                                            <span className="text-slate-700 dark:text-slate-300">{mat?.type} - {mat?.model}</span>
                                                            <div className="flex justify-between mt-1">
                                                                <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">{item.serialNumber}</span>
                                                                {item.quantity > 1 && <span className="font-bold">Qtd: {item.quantity}</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {(c.notesOut || c.notesIn) && (
                                                <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2">
                                                    {c.notesOut && <p><span className="font-bold">Obs. Saída:</span> {c.notesOut}</p>}
                                                    {c.notesIn && <p><span className="font-bold">Obs. Devolução:</span> {c.notesIn}</p>}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Checkin Modal */}
        {selectedCautela && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
                    <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Confirmar Devolução</h3>
                    <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                        <p className="font-bold text-slate-700 dark:text-slate-300">{selectedCautela.personnelName}</p>
                        <p className="text-sm text-slate-500 mb-3">Saída: {new Date(selectedCautela.timestampOut).toLocaleString()}</p>
                        <ul className="space-y-2">
                            {selectedCautela.items.map((item, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm dark:text-slate-300">
                                    <CheckCircle size={16} className="text-green-500"/>
                                    <span className="font-mono bg-white dark:bg-slate-700 px-1 rounded border border-slate-200 dark:border-slate-600">{item.serialNumber}</span>
                                    <span>- {materials.find(m=>m.id === item.materialId)?.type}</span>
                                    {item.quantity > 1 && <span className="font-bold text-slate-600 dark:text-slate-400">(Qtd: {item.quantity})</span>}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Optional Return Signature */}
                    <div className="mb-6">
                        <SignaturePad onSave={setSignatureIn} label="Assinatura na Devolução (Opcional)" />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button onClick={() => { setSelectedCautela(null); setSignatureIn(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancelar</button>
                        <button onClick={() => handleReturn(selectedCautela)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">Confirmar Recebimento</button>
                    </div>
                </div>
            </div>
        )}

        {/* View Signature Modal */}
        {viewSignature && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewSignature(null)}>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">Assinatura Digital</h3>
                        </div>
                        <button onClick={() => setViewSignature(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="p-6 bg-white flex justify-center">
                        <img src={viewSignature} alt="Assinatura" className="max-w-full h-auto border border-slate-200 rounded-lg shadow-sm" />
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 text-center">
                        <p className="text-xs text-slate-400">Registro de Autenticidade Digital</p>
                    </div>
                </div>
            </div>
        )}
      </div>
  );

  return view === 'NEW' ? renderNewCautelaForm() : renderList();
};