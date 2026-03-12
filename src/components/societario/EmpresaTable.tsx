
import React from "react";
import { Building2, Eye, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Empresa } from "@/types/societario";

interface EmpresaTableProps {
  empresas: Empresa[];
}

const regimeLabels: Record<string, string> = {
  simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI",
};

const situacaoConfig: Record<string, { label: string; cls: string }> = {
  ativa: { label: "Ativa", cls: "badge-success" },
  paralisada: { label: "Paralisada", cls: "badge-warning" },
  baixada: { label: "Baixada", cls: "badge-danger" },
};

export const EmpresaTable = ({ empresas }: EmpresaTableProps) => {
  const navigate = useNavigate();

  return (
    <div className="card-premium !p-0 overflow-hidden border-t-0 rounded-t-none">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="rounded-tl-none">Empresa</th>
              <th>CNPJ</th>
              <th>Regime</th>
              <th className="text-center">Situação</th>
              <th className="text-center">Sócios</th>
              <th className="text-right pr-8">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {empresas.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-24 text-muted-foreground bg-muted/5">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-6 rounded-full bg-muted/10">
                      <Building2 size={48} className="opacity-20" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-xl text-card-foreground">Nenhuma empresa encontrada</p>
                      <p className="text-sm">Tente ajustar seus filtros de busca para encontrar o que procura.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              empresas.map((emp) => {
                const sit = situacaoConfig[emp.situacao || "ativa"] || situacaoConfig.ativa;
                return (
                  <tr key={emp.id} className="cursor-pointer group transition-all" onClick={() => navigate(`/societario/${emp.id}`)}>
                    <td className="py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
                          <Building2 size={22} />
                        </div>
                        <div>
                          <p className="font-black text-card-foreground group-hover:text-primary transition-colors text-base">{emp.nome_empresa}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">ID: {emp.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground font-mono text-xs">{emp.cnpj || "—"}</td>
                    <td>
                      <span className="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground border border-border/50">
                        {regimeLabels[emp.regime_tributario || ""] || "—"}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`badge-status ${sit.cls} shadow-sm shadow-current/5 font-black text-[10px] px-3 py-1`}>{sit.label}</span>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-muted/50 text-xs font-black text-card-foreground border border-border/50">
                        {emp.socios_count || 0}
                      </span>
                    </td>
                    <td className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => navigate(`/societario/${emp.id}`)} className="p-3 rounded-2xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20" title="Ver Detalhes">
                          <Eye size={20} />
                        </button>
                        <button onClick={() => navigate(`/societario/${emp.id}`)} className="p-3 rounded-2xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20" title="Editar">
                          <Edit2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
