import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, User, Lock, Upload, Camera, Loader2, LayoutDashboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarCustomizer } from "@/components/SidebarCustomizer";
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

const PerfilPage: React.FC = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upLoading, setUpLoading] = useState(false);
  const [form, setForm] = useState({
    nome_completo: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
    foto_url: "",
    endereco: { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" } as Endereco,
  });

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        const end = (data.endereco || {}) as any;
        setForm({
          nome_completo: data.nome_completo || "",
          cpf: data.cpf || "",
          telefone: data.telefone || "",
          data_nascimento: data.data_nascimento || "",
          foto_url: data.foto_url || "",
          endereco: {
            cep: end.cep || "", logradouro: end.logradouro || "", numero: end.numero || "",
            complemento: end.complemento || "", bairro: end.bairro || "", cidade: end.cidade || "", estado: end.estado || "",
          },
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);



  const formatCEP = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.replace(/(\d{5})(\d)/, "$1-$2");
  };

  const formatTelefone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUpLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ foto_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setForm(prev => ({ ...prev, foto_url: publicUrl }));
      toast.success("Foto atualizada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao fazer upload: " + err.message);
    } finally {
      setUpLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_completo.trim() || !form.cpf.trim()) {
      toast.error("Nome e CPF são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        nome_completo: form.nome_completo,
        cpf: form.cpf,
        telefone: form.telefone,
        data_nascimento: form.data_nascimento || null,
        endereco: form.endereco as any,
      }).eq("user_id", user!.id);
      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateEndereco = (key: keyof Endereco, value: string) => {
    setForm(prev => ({ ...prev, endereco: { ...prev.endereco, [key]: value } }));
  };

  const estados = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

  if (loading) return <div className="flex items-center justify-center p-8"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex flex-col items-center gap-4 mb-8 text-center">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full border-4 border-background shadow-xl overflow-hidden bg-primary/10 flex items-center justify-center relative">
            {form.foto_url ? (
              <img src={form.foto_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={64} className="text-primary" />
            )}
            {upLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            )}
          </div>
          <label htmlFor="foto-upload" className="absolute bottom-1 right-1 p-2.5 rounded-full bg-primary text-primary-foreground shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all">
            <Camera size={18} />
            <input 
              id="foto-upload" 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload}
              disabled={upLoading}
            />
          </label>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-card-foreground">Meu Perfil</h3>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e de acesso</p>
        </div>
      </div>

      <Tabs defaultValue="dados" className="space-y-6">
        <TabsList className="grid grid-cols-1 md:grid-cols-3 w-full max-w-2xl mx-auto bg-muted/20 p-1 mb-8 gap-2">
          <TabsTrigger value="dados" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <User size={16} /> Meus Dados
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <LayoutDashboard size={16} /> Personalizar Menu
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Lock size={16} /> Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          <div className="module-card">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-card-foreground mb-1">Nome Completo</label>
                  <input value={form.nome_completo} onChange={e => setForm({ ...form, nome_completo: e.target.value })} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">CPF</label>
                  <input value={form.cpf} onChange={e => setForm({ ...form, cpf: maskCPF(e.target.value) })} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Telefone</label>
                  <input value={form.telefone} onChange={e => setForm({ ...form, telefone: formatTelefone(e.target.value) })} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Data de Nascimento</label>
                  <input type="date" value={form.data_nascimento} onChange={e => setForm({ ...form, data_nascimento: e.target.value })} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">E-mail</label>
                  <input value={user?.email || ""} disabled className="w-full px-3 py-2.5 border border-border rounded-lg bg-muted/50 text-muted-foreground text-sm cursor-not-allowed" />
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h2 className="text-base font-semibold text-card-foreground mb-4">Endereço</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">CEP</label>
                    <input value={form.endereco.cep} onChange={e => updateEndereco("cep", formatCEP(e.target.value))} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-card-foreground mb-1">Logradouro</label>
                    <input value={form.endereco.logradouro} onChange={e => updateEndereco("logradouro", e.target.value)} className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
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

              <div className="flex justify-end pt-4">
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-50" style={{ background: "var(--gradient-primary)" }}>
                  <Save size={16} /> {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          <div className="module-card">
            <SidebarCustomizer />
          </div>
        </TabsContent>

        <TabsContent value="seguranca" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Lock size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Alterar Senha</h2>
                <p className="text-sm text-muted-foreground">Mantenha sua conta segura</p>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const target = e.currentTarget;
                const newPassword = (target.elements.namedItem("newPassword") as HTMLInputElement).value;
                const confirmPassword = (target.elements.namedItem("confirmPassword") as HTMLInputElement).value;

                if (newPassword.length < 8) {
                  toast.error("A nova senha deve ter pelo menos 8 caracteres.");
                  return;
                }
                if (newPassword !== confirmPassword) {
                  toast.error("As senhas não coincidem.");
                  return;
                }

                try {
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) throw error;
                  toast.success("Senha alterada com sucesso!");
                  target.reset();
                } catch (err: any) {
                  toast.error("Erro ao alterar senha: " + err.message);
                }
              }} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1">Nova Senha</label>
                  <input
                    name="newPassword"
                    type="password"
                    placeholder="No mínimo 8 caracteres"
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1">Confirmar Nova Senha</label>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Repita a nova senha"
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Atualizar Senha
                </button>
              </form>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerfilPage;
