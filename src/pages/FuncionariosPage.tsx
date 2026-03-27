import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, Save, User, Calendar, Shield, Briefcase, Users } from "lucide-react";
import { toast } from "sonner";
import { maskCPF, formatDateBR } from "@/lib/utils";

interface Funcionario {
  id?: string;
  empresa_id: string;
  nome: string;
  cpf: string;
  data_admissao: string;
  cargo: string;
  vencimento_ferias: string;
  data_ultimo_aso: string;
  vencimento_aso: string;
  ativo: boolean;
}

const FuncionariosPage: React.FC = () => {
  const { empresaId } = useParams<{ empresaId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [empresaNome, setEmpresaNome] = useState("");
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [newFunc, setNewFunc] = useState<Partial<Funcionario>>({
    nome: "", cpf: "", cargo: "", data_admissao: "",
    vencimento_ferias: "", data_ultimo_aso: "", vencimento_aso: "",
    ativo: true
  });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!empresaId) return;
      setLoading(true);
      
      const { data: emp } = await supabase.from("empresas").select("nome_empresa").eq("id", empresaId).single();
      if (emp) setEmpresaNome(emp.nome_empresa);

      const { data: funcs } = await supabase.from("funcionarios" as any).select("*").eq("empresa_id", empresaId).order("nome");
      if (funcs) setFuncionarios(funcs as any);
      
      setLoading(false);
    };
    loadData();
  }, [empresaId]);

  const handleAdd = async () => {
    if (!newFunc.nome) { toast.error("Nome é obrigatório"); return; }
    try {
      const payload = { ...newFunc, empresa_id: empresaId };
      const { data, error } = await supabase.from("funcionarios" as any).insert([payload]).select().single();
      if (error) throw error;
      setFuncionarios([...funcionarios, data as any]);
      setNewFunc({ nome: "", cpf: "", cargo: "", data_admissao: "", vencimento_ferias: "", data_ultimo_aso: "", vencimento_aso: "", ativo: true });
      setIsAdding(false);
      toast.success("Funcionário adicionado!");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este funcionário?")) return;
    try {
      const { error } = await supabase.from("funcionarios" as any).delete().eq("id", id);
      if (error) throw error;
      setFuncionarios(funcionarios.filter(f => f.id !== id));
      toast.success("Funcionário removido");
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="p-6 space-y-6 container max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-bold">Gestão de Funcionários</h1>
            <p className="text-sm text-muted-foreground">{empresaNome}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-all"
        >
          {isAdding ? "Cancelar" : <><Plus size={16} /> Novo Funcionário</>}
        </button>
      </div>

      {isAdding && (
        <div className="module-card animate-in fade-in slide-in-from-top-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Novo Cadastro</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2"><label className={labelCls}>Nome Completo</label><input value={newFunc.nome} onChange={e => setNewFunc({...newFunc, nome: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>CPF</label><input value={newFunc.cpf} onChange={e => setNewFunc({...newFunc, cpf: maskCPF(e.target.value)})} className={inputCls} /></div>
            <div><label className={labelCls}>Cargo</label><input value={newFunc.cargo} onChange={e => setNewFunc({...newFunc, cargo: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Data Admissão</label><input type="date" value={newFunc.data_admissao} onChange={e => setNewFunc({...newFunc, data_admissao: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Vencimento Férias</label><input type="date" value={newFunc.vencimento_ferias} onChange={e => setNewFunc({...newFunc, vencimento_ferias: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Último ASO</label><input type="date" value={newFunc.data_ultimo_aso} onChange={e => setNewFunc({...newFunc, data_ultimo_aso: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Vencimento ASO</label><input type="date" value={newFunc.vencimento_aso} onChange={e => setNewFunc({...newFunc, vencimento_aso: e.target.value})} className={inputCls} /></div>
            <div className="flex items-end"><button onClick={handleAdd} className="w-full h-[38px] flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-all"><Save size={16} /> Salvar Funcionário</button></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {funcionarios.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
            <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum funcionário cadastrado nesta empresa.</p>
          </div>
        ) : (
          funcionarios.map(func => (
            <div key={func.id} className="module-card flex items-center justify-between p-4 hover:border-primary/30 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"><User size={24} /></div>
                <div>
                  <h3 className="font-bold text-card-foreground">{func.nome}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Shield size={12} /> {func.cpf || "CPF N/D"}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Briefcase size={12} /> {func.cargo || "Cargo N/D"}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar size={12} /> Admissão: {func.data_admissao ? formatDateBR(func.data_admissao) : "N/D"}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${new Date(func.vencimento_aso!) < new Date(Date.now() + 30*24*60*60*1000) ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>ASO: {func.vencimento_aso ? formatDateBR(func.vencimento_aso) : "N/D"}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${new Date(func.vencimento_ferias!) < new Date(Date.now() + 30*24*60*60*1000) ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>Férias: {func.vencimento_ferias ? formatDateBR(func.vencimento_ferias) : "N/D"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(func.id!)} className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FuncionariosPage;
