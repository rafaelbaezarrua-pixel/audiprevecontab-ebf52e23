import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Mail, Clock, Shield, Plus, ArrowRight, Trash2, CalendarDays, Key, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AlertType {
  id: string;
  label: string;
  description: string;
  is_enabled: boolean;
}

interface NotificationRule {
  id: string;
  module_id: string;
  trigger_name: string;
  days_before: number;
  is_active: boolean;
}

const moduleLabels: Record<string, string> = {
  licencas: "Licenças",
  certificados: "Certificados Digitais",
  procuracoes: "Procurações",
  certidoes: "Certidões",
  vencimentos: "Vencimentos",
};

const GestorAlertasPage: React.FC = () => {
  const [alertTypes, setAlertTypes] = useState<AlertType[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRule, setShowAddRule] = useState(false);
  
  const [newRule, setNewRule] = useState({
    module_id: "licencas",
    trigger_name: "",
    days_before: 7
  });

  const fetchAlertTypes = async () => {
    try {
      const { data, error } = await supabase.from("notification_types").select("*");
      if (error) throw error;
      setAlertTypes((data as AlertType[]) || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notification_rules" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRules((data as unknown as NotificationRule[]) || []);
    } catch (err: any) {
      toast.error("Erro ao carregar regras de alertas.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertTypes();
    fetchRules();
  }, []);

  const toggleAlertType = async (id: string, current: boolean) => {
    try {
      await supabase.from("notification_types").update({ is_enabled: !current }).eq("id", id);
      toast.success("Status atualizado!");
      fetchAlertTypes();
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const toggleRuleStatus = async (id: string, current: boolean) => {
    try {
      await supabase.from("notification_rules" as any).update({ is_active: !current }).eq("id", id);
      toast.success("Regra atualizada!");
      fetchRules();
    } catch (err) {
      toast.error("Erro ao atualizar regra");
    }
  };

  const deleteRule = async (id: string) => {
    if (!window.confirm("Deseja excluir esta regra de disparo?")) return;
    try {
      await supabase.from("notification_rules" as any).delete().eq("id", id);
      toast.success("Regra excluída!");
      fetchRules();
    } catch (err) {
      toast.error("Erro ao excluir regra");
    }
  };

  const handleAddRule = async () => {
    if (!newRule.trigger_name) {
      toast.error("Digite o nome do gatilho");
      return;
    }
    try {
      const { error } = await supabase.from("notification_rules" as any).insert([newRule]);
      if (error) throw error;
      toast.success("Nova regra adicionada!");
      setShowAddRule(false);
      setNewRule({ module_id: "licencas", trigger_name: "", days_before: 7 });
      fetchRules();
    } catch (err) {
      toast.error("Erro ao adicionar regra");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="header-title text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Bell className="text-primary" size={28} /> Gestor de Alertas
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure disparos automáticos de e-mails para os clientes do portal.
          </p>
        </div>
        <button 
          className="button-premium" 
          onClick={() => setShowAddRule(!showAddRule)}
        >
          {showAddRule ? <X size={18} /> : <Plus size={18} />} 
          {showAddRule ? "Cancelar" : "Nova Regra de Disparo"}
        </button>
      </div>

      {showAddRule && (
        <div className="card-premium p-6 animate-scale-in border-primary/30">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus className="text-primary" size={20} /> Adicionar Nova Regra
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Módulo</label>
              <select 
                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm"
                value={newRule.module_id}
                onChange={(e) => setNewRule({...newRule, module_id: e.target.value})}
              >
                {Object.entries(moduleLabels).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Gatilho (Nome do Documento/Evento)</label>
              <input 
                type="text" 
                placeholder="Ex: Alvará, e-CNPJ..."
                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm"
                value={newRule.trigger_name}
                onChange={(e) => setNewRule({...newRule, trigger_name: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Disparar antes (Dias)</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm"
                value={newRule.days_before}
                onChange={(e) => setNewRule({...newRule, days_before: parseInt(e.target.value)})}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button className="button-premium" onClick={handleAddRule}>
              Confirmar Regra
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel Principal: Cronogramas / Regras Fictícias por enquanto (UI Ilustrativa que aproxima ao real) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-premium p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
              <CalendarDays className="text-primary" size={20} /> Regras de Disparo Ativas
            </h2>

            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                   <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-12 bg-muted/10 rounded-2xl border border-dashed border-border">
                  <p className="text-muted-foreground">Nenhuma regra configurada ainda.</p>
                </div>
              ) : rules.map((rule) => (
                <div key={rule.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${rule.is_active ? "border-border/50 bg-muted/20 hover:bg-muted/40" : "border-border/30 bg-muted/5 opacity-60"}`}>
                  <div className="flex items-start gap-4">
                    <div 
                      className={`p-2.5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${rule.is_active ? "bg-background border-border text-primary" : "bg-muted border-transparent text-muted-foreground"}`}
                      onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                    >
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm uppercase tracking-tight">{rule.trigger_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Módulo: {moduleLabels[rule.module_id] || rule.module_id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0 mt-3 sm:mt-0 border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Disparo:</span>
                      <span className="text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {rule.days_before} dias antes
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                       <div className="w-px h-6 bg-border/50 hidden sm:block" />
                       <button 
                         className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                         onClick={() => deleteRule(rule.id)}
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-border/50">
               <div className="bg-info/10 border border-info/20 p-4 rounded-xl flex gap-3">
                  <Mail className="text-info shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs font-semibold text-info mb-1">Como funcionam os clientes?</p>
                    <p className="text-xs text-info/80 leading-relaxed">
                      Quando uma regra atinge a data (ex: 7 dias antes do vencimento do e-CNPJ), 
                      o sistema buscará na tabela de Usuários o campo <strong>"E-mail de Alertas"</strong> 
                      configurado para a empresa vinculada e fará o envio por SMTP usando a Edge Function agendada.
                    </p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar Direita: Categorias Nativas */}
        <div className="space-y-6">
          <div className="card-premium p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Shield className="text-primary" size={20} /> Módulos Habilitados
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              Estes são os módulos internos do sistema que atualmente suportam o rastreio de notificações visuais.
            </p>

            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : alertTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background">
                  <div>
                    <p className="text-sm font-bold text-foreground">{type.label}</p>
                  </div>
                  <button
                    onClick={() => toggleAlertType(type.id, type.is_enabled)}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${
                      type.is_enabled ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${
                        type.is_enabled ? "left-5" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card-premium p-6 bg-gradient-to-br from-background to-muted/30 border-primary/20">
             <h2 className="text-sm font-bold flex items-center gap-2 mb-2">
                <Key className="text-primary" size={16} /> Edge Function do Provedor
             </h2>
             <p className="text-xs text-muted-foreground leading-relaxed mb-4">
               Para que os e-mails cheguem fisicamente à caixa de entrada do cliente final, o provedor externo 
               (Resend, SendGrid) precisa ser injetado na próxima versão (Phase 6: Edge Function <code className="bg-muted px-1 py-0.5 rounded">send-alert-email</code>).
             </p>
             <button className="w-full py-2.5 text-xs font-bold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2">
               Acessar Documentação <ArrowRight size={14} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestorAlertasPage;
