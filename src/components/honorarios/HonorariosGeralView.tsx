
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
  todasEmpresas: any[];
  globalCompetencia: string;
  setGlobalCompetencia: (comp: string) => void;
  onToggleMensalPago: (id: string, current: boolean) => void;
  onToggleMensalStatus: (id: string, current: string) => void;
  onToggleEsporadicoPago: (id: string, current: boolean) => void;
  onDeleteEsporadico: (id: string) => void;
  onSaveEsporadico: (data: any) => void;
  onActionGerar: (empresaId: string) => void;
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
  onActionGerar
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-center justify-between bg-card border border-border p-4 rounded-xl shadow-sm gap-4">
        <div className="flex bg-muted/50 p-1 rounded-lg">
          <button 
            onClick={() => setSubTab("mensal")}
            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${subTab === "mensal" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Honorários Mensais
          </button>
          <button 
            onClick={() => setSubTab("esporadicos")}
            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${subTab === "esporadicos" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Serviços Esporádicos
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Pago:</label>
            <select 
              value={filterPago} 
              onChange={(e) => setFilterPago(e.target.value as any)}
              className="px-2 py-1.5 border border-border rounded-lg bg-background text-xs font-bold"
            >
              <option value="todos">Todos</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Envio:</label>
            <select 
              value={filterEnvio} 
              onChange={(e) => setFilterEnvio(e.target.value as any)}
              className="px-2 py-1.5 border border-border rounded-lg bg-background text-xs font-bold"
            >
              <option value="todos">Todos</option>
              <option value="enviado">Enviado</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>

          <div className="h-8 w-px bg-border mx-2 hidden sm:block" />

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Competência:</label>
            <input
              type="month"
              value={globalCompetencia}
              onChange={(e) => setGlobalCompetencia(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary"
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="module-card border border-border/50 bg-card/30 backdrop-blur-md">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-card-foreground flex items-center gap-2">
                    <TrendingUp size={20} className="text-primary" /> Faturamento vs Recebimento
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">Situação - {globalCompetencia}</p>
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: "Honorários", total: totalValorAgregado, pago: totalPago, pendente: totalPendente }]}>
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                      itemStyle={{ fontWeight: 'bold' }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend />
                    <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pago" name="Pago" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pendente" name="Pendente" fill="#F59E0B" radius={[4, 4, 0, 0]} />
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
          />

          {empresasFaltantes.length > 0 && (
            <div className="module-card border-2 border-dashed border-warning/30 bg-warning/5 overflow-hidden">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-black text-warning flex items-center gap-2 uppercase tracking-widest">
                  <Clock size={16} /> Empresas sem Honorário Gerado ({empresasFaltantes.length})
                </h3>
                <p className="text-[10px] text-warning font-bold">Essas empresas estão ativas mas não possuem registro em {globalCompetencia}</p>
              </div>
              
              <div className="bg-background/50 rounded-xl border border-warning/10 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-warning/10 text-[10px] uppercase text-warning font-black">
                    <tr>
                      <th className="px-5 py-3">Empresa</th>
                      <th className="px-5 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warning/10">
                    {empresasFaltantes.map(e => (
                      <tr key={e.id} className="hover:bg-warning/5 transition-colors">
                        <td className="px-5 py-3 text-xs font-bold text-card-foreground">
                          {e.nome_empresa}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button 
                            onClick={() => onActionGerar(e.id)}
                            className="bg-warning text-warning-foreground text-[10px] font-black px-3 py-1 rounded-lg shadow-sm hover:scale-105 transition-all uppercase tracking-tighter"
                          >
                            Gerar Honorário
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border-2 border-primary/10 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1 font-black">Total Esporádicos</p>
              <p className="text-2xl font-black text-primary">{formatCurrency(totalEsporadicos)}</p>
            </div>
            <div className="bg-card border-2 border-emerald-500/10 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1 font-black">Total Recebido</p>
              <p className="text-2xl font-black text-emerald-500">{formatCurrency(totalEsporadicosPago)}</p>
            </div>
            <div className="flex items-center justify-end">
              <button 
                onClick={() => setIsAddingEsporadico(!isAddingEsporadico)}
                className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-all text-xs uppercase tracking-widest"
              >
                {isAddingEsporadico ? <X size={18} /> : <Plus size={18} />}
                {isAddingEsporadico ? 'Cancelar' : 'Novo Serviço'}
              </button>
            </div>
          </div>

          {isAddingEsporadico && (
            <div className="bg-card border border-primary/20 rounded-xl p-6 shadow-md animate-in slide-in-from-top-2">
              <h3 className="font-bold text-primary mb-4 flex items-center gap-2 uppercase text-xs tracking-widest"><Plus size={16} /> Novo Serviço Esporádico</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <label className={labelCls}>Cliente</label>
                  <input type="text" value={newEsporadico.nome_cliente} onChange={e => setNewEsporadico({...newEsporadico, nome_cliente: e.target.value})} className={inputCls} placeholder="Nome do cliente" />
                </div>
                <div>
                  <label className={labelCls}>CPF/CNPJ</label>
                  <input type="text" value={newEsporadico.cpf_cnpj} onChange={e => setNewEsporadico({...newEsporadico, cpf_cnpj: e.target.value})} className={inputCls} placeholder="000.000..." />
                </div>
                <div>
                  <label className={labelCls}>Tipo de Serviço</label>
                  <input type="text" value={newEsporadico.tipo_servico} onChange={e => setNewEsporadico({...newEsporadico, tipo_servico: e.target.value})} className={inputCls} placeholder="Ex: Abertura, IRPF..." />
                </div>
                <div>
                  <label className={labelCls}>Valor (R$)</label>
                  <input type="number" step="0.01" value={newEsporadico.valor} onChange={e => setNewEsporadico({...newEsporadico, valor: Number(e.target.value)})} className={inputCls} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
                <button onClick={() => setIsAddingEsporadico(false)} className="text-xs font-bold text-muted-foreground px-4 py-2 hover:bg-muted rounded-lg font-black uppercase tracking-widest">Cancelar</button>
                <button onClick={() => { onSaveEsporadico(newEsporadico); setIsAddingEsporadico(false); setNewEsporadico({nome_cliente: "", cpf_cnpj: "", tipo_servico: "", valor: 0, pago: false}); }} className="bg-primary text-white text-xs font-bold px-6 py-2 rounded-lg shadow-md uppercase tracking-widest">Salvar Serviço</button>
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
