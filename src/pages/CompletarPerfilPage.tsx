import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import logoAudipreve from "@/assets/logo-audipreve.png";
import { maskCPF } from "@/lib/utils";


interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const CompletarPerfilPage: React.FC = () => {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_completo: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
    endereco: { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" } as Endereco,
  });



  const formatCEP = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.replace(/(\d{5})(\d)/, "$1-$2");
  };

  const formatTelefone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_completo.trim() || !form.cpf.trim() || !form.data_nascimento || !form.endereco.cep.trim() || !form.endereco.logradouro.trim() || !form.endereco.cidade.trim() || !form.endereco.estado.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        nome_completo: form.nome_completo,
        cpf: form.cpf,
        telefone: form.telefone,
        data_nascimento: form.data_nascimento,
        endereco: form.endereco as any,
        profile_completed: true,
      }).eq("user_id", user!.id);

      if (error) throw error;
      await refreshUserData();
      toast.success("Perfil completado com sucesso!");
      navigate("/termos", { replace: true });
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateEndereco = (key: keyof Endereco, value: string) => {
    setForm(prev => ({ ...prev, endereco: { ...prev.endereco, [key]: value } }));
  };

  const estados = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" style={{ background: "var(--gradient-bg)" }}>
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-xl border border-border p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={logoAudipreve} alt="Audipreve" className="w-16 h-16 object-contain mb-4" />
          <h1 className="text-2xl font-bold text-card-foreground">Complete seu Cadastro</h1>
          <p className="text-sm text-muted-foreground mt-1">Preencha suas informações pessoais para acessar o sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-card-foreground mb-1">Nome Completo *</label>
              <input value={form.nome_completo} onChange={e => setForm({ ...form, nome_completo: e.target.value })} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Seu nome completo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">CPF *</label>
              <input value={form.cpf} onChange={e => setForm({ ...form, cpf: maskCPF(e.target.value) })} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="000.000.000-00" />

            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Telefone</label>
              <input value={form.telefone} onChange={e => setForm({ ...form, telefone: formatTelefone(e.target.value) })} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Data de Nascimento *</label>
              <input type="date" value={form.data_nascimento} onChange={e => setForm({ ...form, data_nascimento: e.target.value })} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Endereço *</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">CEP</label>
                <input value={form.endereco.cep} onChange={e => updateEndereco("cep", formatCEP(e.target.value))} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="00000-000" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-card-foreground mb-1">Logradouro</label>
                <input value={form.endereco.logradouro} onChange={e => updateEndereco("logradouro", e.target.value)} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Rua, Av., etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Número</label>
                <input value={form.endereco.numero} onChange={e => updateEndereco("numero", e.target.value)} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Complemento</label>
                <input value={form.endereco.complemento} onChange={e => updateEndereco("complemento", e.target.value)} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Bairro</label>
                <input value={form.endereco.bairro} onChange={e => updateEndereco("bairro", e.target.value)} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Cidade</label>
                <input value={form.endereco.cidade} onChange={e => updateEndereco("cidade", e.target.value)} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Estado</label>
                <select value={form.endereco.estado} onChange={e => updateEndereco("estado", e.target.value)} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none">
                  <option value="">Selecione</option>
                  {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full py-3 rounded-lg text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-50 transition-all" style={{ background: "var(--gradient-primary)" }}>
            {saving ? "Salvando..." : "Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompletarPerfilPage;
