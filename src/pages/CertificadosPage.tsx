import React, { useEffect, useState } from "react";
import { db, ref, onValue, update } from "@/lib/firebase";
import { Search, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp, Save, Video, User } from "lucide-react";
import { toast } from "sonner";

interface Empresa {
  id: string;
  nomeEmpresa: string;
  cnpj: string;
  socios?: Record<string, { nome: string; cpf: string; administrador: boolean }>;
}

interface CertificadoData {
  dataValidade?: string;
  tipo?: string; // a1, a3, e-cpf, e-cnpj, nfe
  modalidade?: string; // videoconferencia, presencial
  responsavel?: string;
  responsavelCpf?: string;
}

const tipoLabels: Record<string, string> = {
  a1: "A1 (Arquivo)", a3: "A3 (Token)", "e-cpf": "e-CPF", "e-cnpj": "e-CNPJ", nfe: "NF-e"
};

const calcDias = (data?: string) => {
  if (!data) return 999;
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
};

const CertificadosPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [certData, setCertData] = useState<Record<string, CertificadoData>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, CertificadoData>>({});

  useEffect(() => {
    const unsub1 = onValue(ref(db, "empresas"), (snap) => {
      const data = snap.val() || {};
      setEmpresas(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    const unsub2 = onValue(ref(db, "certificados_digitais"), (snap) => {
      setCertData(snap.val() || {});
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  // Auto-detect responsável (sócio administrador)
  const getResponsavel = (emp: Empresa) => {
    if (!emp.socios) return { nome: "—", cpf: "" };
    const admin = Object.values(emp.socios).find(s => s.administrador);
    return admin ? { nome: admin.nome, cpf: admin.cpf } : { nome: "—", cpf: "" };
  };

  const empresasWithCert = empresas.map(emp => {
    const cert = certData[emp.id] || {};
    const dias = calcDias(cert.dataValidade);
    const status = dias === 999 ? "sem_dados" : dias < 0 ? "vencido" : dias <= 30 ? "proximo" : "ativo";
    const resp = getResponsavel(emp);
    return { ...emp, cert, dias, status, responsavelAuto: resp };
  });

  const filtered = empresasWithCert.filter(e => {
    const matchSearch = e.nomeEmpresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    const matchStatus = filterStatus === "todos" || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    ativos: empresasWithCert.filter(e => e.status === "ativo").length,
    proximos: empresasWithCert.filter(e => e.status === "proximo").length,
    vencidos: empresasWithCert.filter(e => e.status === "vencido").length,
    semDados: empresasWithCert.filter(e => e.status === "sem_dados").length,
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const emp = empresasWithCert.find(e => e.id === id);
    if (emp) {
      setEditForm(prev => ({
        ...prev,
        [id]: {
          dataValidade: emp.cert.dataValidade || "",
          tipo: emp.cert.tipo || "a1",
          modalidade: emp.cert.modalidade || "presencial",
          responsavel: emp.cert.responsavel || emp.responsavelAuto.nome,
          responsavelCpf: emp.cert.responsavelCpf || emp.responsavelAuto.cpf,
        }
      }));
    }
  };

  const handleSave = async (empresaId: string) => {
    const form = editForm[empresaId];
    if (!form) return;
    try {
      await update(ref(db, `certificados_digitais/${empresaId}`), form);
      toast.success("Certificado atualizado!");
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [empresaId]: { ...prev[empresaId], [field]: value }
    }));
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-card-foreground">Certificados Digitais</h1>
        <p className="text-sm text-muted-foreground mt-1">Controle de validade dos certificados de todas as empresas</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ativos", count: counts.ativos, cls: "text-success", bg: "bg-success/10", icon: <CheckCircle size={20} /> },
          { label: "Próximos", count: counts.proximos, cls: "text-warning", bg: "bg-warning/10", icon: <Clock size={20} /> },
          { label: "Vencidos", count: counts.vencidos, cls: "text-destructive", bg: "bg-destructive/10", icon: <AlertTriangle size={20} /> },
          { label: "Sem Dados", count: counts.semDados, cls: "text-muted-foreground", bg: "bg-muted", icon: <AlertTriangle size={20} /> },
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
        <div className="flex gap-2">
          {[
            { key: "todos", label: "Todos" },
            { key: "ativo", label: "Ativos" },
            { key: "proximo", label: "Próximos" },
            { key: "vencido", label: "Vencidos" },
            { key: "sem_dados", label: "Sem Dados" },
          ].map(f => (
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
          const form = editForm[emp.id] || {};
          const statusCls = emp.status === "vencido" ? "badge-danger" : emp.status === "proximo" ? "badge-warning" : emp.status === "ativo" ? "badge-success" : "badge-gray";
          const statusLabel = emp.status === "vencido" ? "Vencido" : emp.status === "proximo" ? "Próximo" : emp.status === "ativo" ? "Ativo" : "Sem dados";

          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">{emp.nomeEmpresa}</p>
                    <p className="text-xs text-muted-foreground">{emp.cnpj || "—"} • Responsável: {emp.responsavelAuto.nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {emp.cert.tipo && <span className="text-xs text-muted-foreground">{tipoLabels[emp.cert.tipo] || emp.cert.tipo}</span>}
                  <span className={`badge-status ${statusCls}`}>{statusLabel}</span>
                  {emp.dias !== 999 && <span className="text-xs text-muted-foreground">{emp.dias}d</span>}
                  {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-5 space-y-4 bg-muted/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Tipo do Certificado</label>
                      <select value={form.tipo || "a1"} onChange={e => updateForm(emp.id, "tipo", e.target.value)} className={inputCls}>
                        <option value="a1">A1 (Arquivo)</option>
                        <option value="a3">A3 (Token)</option>
                        <option value="e-cpf">e-CPF</option>
                        <option value="e-cnpj">e-CNPJ</option>
                        <option value="nfe">NF-e</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Data de Validade</label>
                      <input type="date" value={form.dataValidade || ""} onChange={e => updateForm(emp.id, "dataValidade", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Modalidade</label>
                      <select value={form.modalidade || "presencial"} onChange={e => updateForm(emp.id, "modalidade", e.target.value)} className={inputCls}>
                        <option value="presencial">Presencial</option>
                        <option value="videoconferencia">Videoconferência</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Responsável (Sócio Administrador)</label>
                      <input value={form.responsavel || ""} onChange={e => updateForm(emp.id, "responsavel", e.target.value)} className={inputCls} readOnly />
                    </div>
                    <div>
                      <label className={labelCls}>CPF do Responsável</label>
                      <input value={form.responsavelCpf || ""} className={inputCls} readOnly />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => handleSave(emp.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}>
                      <Save size={14} /> Salvar
                    </button>
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

export default CertificadosPage;
