
import React, { useState } from "react";
import { TrendingUp, Plus, X, Clock, Filter } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from "recharts";
import { HonorarioMensal, ServicoEsporadico } from "@/types/honorarios";
import { HonorariosStats } from "./HonorariosStats";
import { HonorariosMensalTable } from "./HonorariosMensalTable";
import { HonorariosEsporadicosTable } from "./HonorariosEsporadicosTable";
import { RevenueChart } from "../dashboard/RevenueChart";

interface HonorariosGeralViewProps {
  geralData: HonorarioMensal[];
  esporadicosData: ServicoEsporadico[];
  revenueTrend: { month: string; total: number; pago: number; }[];
  todasEmpresas: { id: string; situacao: string; nome_empresa?: string }[];
  globalCompetencia: string;
  setGlobalCompetencia: (comp: string) => void;
  onToggleMensalPago: (id: string, current: boolean) => void;
  onToggleMensalStatus: (id: string, current: string) => void;
  onToggleEsporadicoPago: (id: string, current: boolean) => void;
  onDeleteEsporadico: (id: string) => void;
  onSaveEsporadico: (data: Omit<ServicoEsporadico, 'competencia' | 'id'>) => void;
  onActionGerar: (empresaId: string) => void;
  onUpdateValor: (id: string, newValue: number) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const HonorariosGeralView = ({
  geralData,
  esporadicosData,
  revenueTrend,
  todasEmpresas,
  globalCompetencia,
  setGlobalCompetencia,
  onToggleMensalPago,
  onToggleMensalStatus,
  onToggleEsporadicoPago,
  onDeleteEsporadico,
  onSaveEsporadico,
  onActionGerar,
  onUpdateValor
}: HonorariosGeralViewProps) => {
  const [subTab, setSubTab] = useState<"mensal" | "esporadicos">("mensal");
  const [filterPago, setFilterPago] = useState<"todos" | "pago" | "pendente">("todos");
  const [filterEnvio, setFilterEnvio] = useState<"todos" | "enviado" | "pendente">("todos");
  const [isAddingEsporadico, setIsAddingEsporadico] = useState(false);
  const [newEsporadico, setNewEsporadico] = useState({
    nome_cliente: "", cpf_cnpj: "", tipo_servico: "", valor: 0, pago: false
  });

  const totalValorAgregado = geralData.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
  const totalPago = geralData.filter(d => d.pago).reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
  const totalPendente = totalValorAgregado - totalPago;
  const eficienciaCobranca = totalValorAgregado > 0 ? Math.round((totalPago / totalValorAgregado) * 100) : 0;

  const totalEsporadicos = esporadicosData.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const totalEsporadicosPago = esporadicosData.filter(d => d.pago).reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const filteredGeral = geralData.filter(d => {
    const matchPago = filterPago === "todos" ? true : filterPago === "pago" ? d.pago : !d.pago;
    const matchEnvio = filterEnvio === "todos" ? true : filterEnvio === "enviado" ? d.status === "enviada" : d.status !== "enviada";
    return matchPago && matchEnvio;
  });

  const empresasComHonorario = new Set(geralData.map(d => d.empresa_id));
  const empresasFaltantes = todasEmpresas?.filter(e => e.situacao === "ativa" && !empresasComHonorario.has(e.id)) || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between bg-black/10 dark:bg-white/5 border border-border/10 p-2 rounded-xl shadow-inner gap-3">
        <div className="flex bg-black/10 dark:bg-white/10 p-0.5 rounded-lg h-9 shadow-inner">
          <button 
            onClick={() => setSubTab("mensal")}
            className={`px-4 h-full text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${subTab === "mensal" ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`}
          >
            Honorários Mensais
          </button>
          <button 
            onClick={() => setSubTab("esporadicos")}
            className={`px-4 h-full text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${subTab === "esporadicos" ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`}
          >
            Serviços Extras
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 h-9 px-2.5 bg-background/50 rounded-lg border border-border/5">
            <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest">Pago</label>
            <select 
              value={filterPago} 
              onChange={(e) => setFilterPago(e.target.value as "todos" | "pago" | "pendente")}
              className="bg-transparent text-[9px] font-black outline-none cursor-pointer text-primary"
            >
              <option value="todos">TODOS</option>
              <option value="pago">PAGO</option>
              <option value="pendente">ABERTO</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 h-9 px-2.5 bg-background/50 rounded-lg border border-border/5">
            <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest">Fluxo</label>
            <select 
              value={filterEnvio} 
              onChange={(e) => setFilterEnvio(e.target.value as "todos" | "enviado" | "pendente")}
              className="bg-transparent text-[9px] font-black outline-none cursor-pointer text-primary"
            >
              <option value="todos">GERAL</option>
              <option value="enviado">ENVIADO</option>
              <option value="pendente">PENDENTE</option>
            </select>
          </div>

          <div className="h-6 w-px bg-border/10 mx-1 hidden md:block" />

          <div className="flex items-center gap-2 h-9 px-3 bg-black/10 rounded-lg border border-border/10 shadow-inner">
            <label className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest">Comp.</label>
            <input
              type="month"
              value={globalCompetencia}
              onChange={(e) => setGlobalCompetencia(e.target.value)}
              className="bg-transparent text-[10px] font-black outline-none text-primary uppercase cursor-pointer w-24"
            />
          </div>
        </div>
      </div>

      {subTab === "mensal" ? (
        <>
          <HonorariosStats 
            totalValorAgregado={totalValorAgregado}
            totalPago={totalPago}
            totalPendente={totalPendente}
            eficienciaCobranca={eficienciaCobranca}
            competencia={globalCompetencia}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="module-card border border-border/10 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest">Faturamento vs Recebimento</h3>
                    <p className="text-[8px] text-muted-foreground/40 font-bold uppercase tracking-wider">DISTRIBUIÇÃO POR STATUS EM {globalCompetencia}</p>
                  </div>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: "Honorários", total: totalValorAgregado, pago: totalPago, pendente: totalPendente }]}>
                    <XAxis dataKey="name" hide />
                    <YAxis tick={{ fontSize: 9 }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontSize: '10px' }}
                      itemStyle={{ fontWeight: 'black', textTransform: 'uppercase' }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 'bold' }} />
                    <Bar dataKey="total" name="Total Gerado" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="pago" name="Confirmado" fill="hsl(var(--primary)/0.6)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="pendente" name="Em Aberto" fill="hsl(var(--primary)/0.2)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <RevenueChart data={revenueTrend} />
          </div>

          <HonorariosMensalTable 
            data={filteredGeral} 
            competencia={globalCompetencia} 
            onTogglePago={onToggleMensalPago} 
            onToggleStatus={onToggleMensalStatus}
            onUpdateValor={onUpdateValor}
          />

          {empresasFaltantes.length > 0 && (
            <div className="module-card border border-amber-500/20 bg-amber-500/[0.02] overflow-hidden !p-0">
              <div className="flex items-center justify-between p-3 border-b border-amber-500/10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Clock size={12} />
                  </div>
                  <h3 className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Pendências de Faturamento ({empresasFaltantes.length})</h3>
                </div>
                <span className="text-[7px] text-amber-500/50 font-black uppercase tracking-widest">EMPRESAS ATIVAS SEM REGISTRO EM {globalCompetencia}</span>
              </div>
              
              <div className="max-h-[220px] overflow-y-auto no-scrollbar">
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-amber-500/5">
                    {empresasFaltantes.map(e => (
                      <tr key={e.id} className="hover:bg-amber-500/5 transition-colors">
                        <td className="px-4 py-2 text-[10px] font-black text-foreground uppercase tracking-tight truncate max-w-[400px]">
                          {e.nome_empresa}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button 
                            onClick={() => onActionGerar(e.id)}
                            className="bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white text-[8px] font-black px-3 py-1 rounded-lg transition-all border border-amber-500/20 uppercase tracking-widest"
                          >
                            Gerar Agora
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-card border border-border/10 rounded-xl p-3 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest mb-0.5">Total Extra</p>
                <p className="text-sm font-black text-primary">{formatCurrency(totalEsporadicos)}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40"><TrendingUp size={16} /></div>
            </div>
            <div className="bg-card border border-border/10 rounded-xl p-3 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest mb-0.5">Total Recebido</p>
                <p className="text-sm font-black text-emerald-500">{formatCurrency(totalEsporadicosPago)}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/5 flex items-center justify-center text-emerald-500/40"><TrendingUp size={16} /></div>
            </div>
            <button 
              onClick={() => setIsAddingEsporadico(!isAddingEsporadico)}
              className="h-14 md:h-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 rounded-xl font-black shadow-lg shadow-primary/20 transition-all text-[9px] uppercase tracking-widest active:scale-95 group"
            >
              {isAddingEsporadico ? <X size={14} className="group-hover:rotate-90 transition-transform" /> : <Plus size={14} className="group-hover:scale-110 transition-transform" />}
              {isAddingEsporadico ? 'Fechar Menu' : 'Novo Serviço'}
            </button>
          </div>

          {isAddingEsporadico && (
            <div className="bg-card border border-primary/20 rounded-xl p-4 shadow-xl animate-in fade-in slide-in-from-top-1 duration-200">
              <h3 className="font-black text-primary mb-4 flex items-center gap-2 uppercase text-[9px] tracking-widest"><Plus size={14} /> Novo Registro de Serviço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="lg:col-span-2 space-y-1">
                  <label className="text-[7px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Nome do Cliente</label>
                  <input type="text" value={newEsporadico.nome_cliente} onChange={e => setNewEsporadico({...newEsporadico, nome_cliente: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-inner" placeholder="IDENTIFICAÇÃO" />
                </div>
                <div className="space-y-1">
                  <label className="text-[7px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Documento</label>
                  <input type="text" value={newEsporadico.cpf_cnpj} onChange={e => setNewEsporadico({...newEsporadico, cpf_cnpj: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-inner" placeholder="CPF / CNPJ" />
                </div>
                <div className="space-y-1">
                  <label className="text-[7px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Tipo de Serviço</label>
                  <input type="text" value={newEsporadico.tipo_servico} onChange={e => setNewEsporadico({...newEsporadico, tipo_servico: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-inner" placeholder="EX: ABERTURA" />
                </div>
                <div className="space-y-1">
                  <label className="text-[7px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Valor Unitário</label>
                  <input type="number" step="0.01" value={newEsporadico.valor} onChange={e => setNewEsporadico({...newEsporadico, valor: Number(e.target.value)})} className="w-full h-9 px-3 rounded-lg border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black focus:ring-1 focus:ring-primary/20 outline-none shadow-inner" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border/5">
                <button onClick={() => setIsAddingEsporadico(false)} className="h-9 px-4 text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:bg-black/5 rounded-lg transition-all">Cancelar</button>
                <button onClick={() => { onSaveEsporadico(newEsporadico); setIsAddingEsporadico(false); setNewEsporadico({nome_cliente: "", cpf_cnpj: "", tipo_servico: "", valor: 0, pago: false}); }} className="h-9 px-6 bg-primary text-white text-[9px] font-black rounded-lg shadow-md hover:bg-primary/90 transition-all uppercase tracking-widest">Confirmar Lançamento</button>
              </div>
            </div>
          )}

          <HonorariosEsporadicosTable 
            data={esporadicosData} 
            competencia={globalCompetencia} 
            onTogglePago={onToggleEsporadicoPago} 
            onDelete={onDeleteEsporadico} 
          />
        </>
      )}
    </div>
  );
};

export default HonorariosGeralView;
