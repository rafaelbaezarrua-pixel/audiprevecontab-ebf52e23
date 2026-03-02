import React, { useEffect, useState } from "react";
import { db, ref, onValue } from "@/lib/firebase";
import { Search, Building2, ChevronDown, ChevronUp, Shield, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface Empresa {
  id: string;
  nomeEmpresa: string;
  cnpj: string;
  licencas?: Record<string, { tipo: string; vencimento?: string; numeroProcesso?: string }>;
}

const licencaLabels: Record<string, string> = {
  alvara: "Alvará de Funcionamento",
  vigilanciaSanitaria: "Vigilância Sanitária",
  corpoBombeiros: "Corpo de Bombeiros",
  meioAmbiente: "Meio Ambiente",
};

const tipoStatusLabels: Record<string, { label: string; cls: string }> = {
  definitiva: { label: "Definitiva", cls: "badge-success" },
  dispensada: { label: "Dispensada", cls: "badge-gray" },
  com_vencimento: { label: "Com Vencimento", cls: "badge-warning" },
  em_processo: { label: "Em Processo", cls: "badge-info" },
  "": { label: "Não definido", cls: "badge-gray" },
};

const calcDias = (data?: string) => {
  if (!data) return 999;
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
};

const LicencasPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onValue(ref(db, "empresas"), (snap) => {
      const data = snap.val() || {};
      setEmpresas(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    return () => unsub();
  }, []);

  const filtered = empresas.filter(e => {
    const matchSearch = e.nomeEmpresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    if (filterStatus === "todos") return matchSearch;
    // Filter by any licença matching the status
    if (!e.licencas) return false;
    return matchSearch && Object.values(e.licencas).some(l => {
      if (filterStatus === "vencida") return l.tipo === "com_vencimento" && calcDias(l.vencimento) < 0;
      if (filterStatus === "proxima") { const d = calcDias(l.vencimento); return l.tipo === "com_vencimento" && d >= 0 && d <= 30; }
      return l.tipo === filterStatus;
    });
  });

  // Count licenças by status
  const allLicencas = empresas.flatMap(e => Object.values(e.licencas || {}).map(l => ({ ...l, empresa: e.nomeEmpresa })));
  const counts = {
    definitiva: allLicencas.filter(l => l.tipo === "definitiva").length,
    dispensada: allLicencas.filter(l => l.tipo === "dispensada").length,
    comVencimento: allLicencas.filter(l => l.tipo === "com_vencimento").length,
    emProcesso: allLicencas.filter(l => l.tipo === "em_processo").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-card-foreground">Controle de Licenças Municipais</h1>
        <p className="text-sm text-muted-foreground mt-1">Visualize o status das licenças conforme cadastrado no Societário</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Definitivas", count: counts.definitiva, cls: "text-success", bg: "bg-success/10", icon: <CheckCircle size={20} /> },
          { label: "Com Vencimento", count: counts.comVencimento, cls: "text-warning", bg: "bg-warning/10", icon: <Clock size={20} /> },
          { label: "Em Processo", count: counts.emProcesso, cls: "text-primary", bg: "bg-primary/10", icon: <Shield size={20} /> },
          { label: "Dispensadas", count: counts.dispensada, cls: "text-muted-foreground", bg: "bg-muted", icon: <AlertTriangle size={20} /> },
        ].map(s => (
          <div key={s.label} className="stat-card flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.cls}`}>{s.count}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} ${s.cls}`}>{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ key: "todos", label: "Todos" }, { key: "definitiva", label: "Definitivas" }, { key: "com_vencimento", label: "Com Vencimento" }, { key: "em_processo", label: "Em Processo" }, { key: "dispensada", label: "Dispensadas" }].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="module-card text-center py-12 text-muted-foreground">Nenhuma empresa encontrada</div>
        ) : filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const licencas = emp.licencas || {};

          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(isOpen ? null : emp.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">{emp.nomeEmpresa}</p>
                    <p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {Object.values(licencas).map((l, i) => {
                    const cfg = tipoStatusLabels[l.tipo] || tipoStatusLabels[""];
                    return <span key={i} className={`badge-status ${cfg.cls} text-[10px]`}>{cfg.label}</span>;
                  })}
                  {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-5 bg-muted/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(licencaLabels).map(([key, label]) => {
                      const lic = licencas[key] || { tipo: "" };
                      const cfg = tipoStatusLabels[lic.tipo] || tipoStatusLabels[""];
                      const dias = lic.tipo === "com_vencimento" ? calcDias(lic.vencimento) : null;

                      return (
                        <div key={key} className="p-4 rounded-xl border border-border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-card-foreground">{label}</h4>
                            <span className={`badge-status ${cfg.cls}`}>{cfg.label}</span>
                          </div>
                          {lic.tipo === "com_vencimento" && lic.vencimento && (
                            <div className="text-xs text-muted-foreground">
                              Vencimento: {new Date(lic.vencimento).toLocaleDateString("pt-BR")}
                              {dias !== null && <span className={`ml-2 font-medium ${dias < 0 ? "text-destructive" : dias <= 30 ? "text-warning" : "text-success"}`}>({dias}d)</span>}
                            </div>
                          )}
                          {lic.tipo === "em_processo" && lic.numeroProcesso && (
                            <div className="text-xs text-muted-foreground">Processo: {lic.numeroProcesso}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LicencasPage;
