import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Clock, AlertTriangle, Award } from "lucide-react";

const DashboardPage: React.FC = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState({ total: 0, ativas: 0, paralisadas: 0, baixadas: 0 });
  const [empresas, setEmpresas] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("empresas").select("id, nome_empresa, cnpj, situacao").order("created_at", { ascending: false }).limit(10);
      const list = data || [];
      setEmpresas(list);
      const { count: total } = await supabase.from("empresas").select("*", { count: "exact", head: true });
      const { count: ativas } = await supabase.from("empresas").select("*", { count: "exact", head: true }).eq("situacao", "ativa");
      const { count: paralisadas } = await supabase.from("empresas").select("*", { count: "exact", head: true }).eq("situacao", "paralisada");
      const { count: baixadas } = await supabase.from("empresas").select("*", { count: "exact", head: true }).eq("situacao", "baixada");
      setStats({ total: total || 0, ativas: ativas || 0, paralisadas: paralisadas || 0, baixadas: baixadas || 0 });
    };
    load();
  }, []);

  const statCards = [
    { label: "Total de Empresas", value: stats.total, icon: <Building2 size={22} />, color: "bg-primary/10 text-primary" },
    { label: "Empresas Ativas", value: stats.ativas, icon: <Award size={22} />, color: "bg-success/10 text-success" },
    { label: "Paralisadas", value: stats.paralisadas, icon: <Clock size={22} />, color: "bg-warning/10 text-warning" },
    { label: "Baixadas", value: stats.baixadas, icon: <AlertTriangle size={22} />, color: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground font-medium">{card.label}</p><h3 className="text-2xl font-bold text-card-foreground mt-1">{card.value}</h3></div><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>{card.icon}</div></div></div>
        ))}
      </div>
      <div className="module-card">
        <h3 className="text-lg font-bold text-card-foreground mb-4">Empresas Recentes</h3>
        {empresas.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">Nenhuma empresa cadastrada</p> : (
          <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Empresa</th><th>CNPJ</th><th>Status</th></tr></thead><tbody>{empresas.map((emp) => (
            <tr key={emp.id}><td className="font-medium text-card-foreground">{emp.nome_empresa || "—"}</td><td className="text-muted-foreground">{emp.cnpj || "—"}</td><td><span className={`badge-status ${emp.situacao === "baixada" ? "badge-danger" : emp.situacao === "paralisada" ? "badge-warning" : "badge-success"}`}>{emp.situacao || "Ativa"}</span></td></tr>
          ))}</tbody></table></div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
