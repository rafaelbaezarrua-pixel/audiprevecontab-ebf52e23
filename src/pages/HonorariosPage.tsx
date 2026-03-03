import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, Building2 } from "lucide-react";
import { toast } from "sonner";

const HonorariosPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("empresas").select("id, nome_empresa, cnpj").neq("situacao", "baixada").order("nome_empresa");
      setEmpresas(data || []);
    };
    load();
  }, []);

  const filtered = empresas.filter(e => e.nome_empresa?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-card-foreground">Honorários</h1><p className="text-sm text-muted-foreground mt-1">Controle mensal de honorários por empresa</p></div>
      <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
      <div className="space-y-3">
        {filtered.map(emp => (
          <div key={emp.id} className="module-card !p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(expanded === emp.id ? null : emp.id)}>
              <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 size={16} className="text-primary" /></div><div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p></div></div>
              {expanded === emp.id ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </div>
            {expanded === emp.id && <div className="border-t border-border p-5 bg-muted/10 text-center text-muted-foreground text-sm">Módulo de honorários em desenvolvimento</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HonorariosPage;
