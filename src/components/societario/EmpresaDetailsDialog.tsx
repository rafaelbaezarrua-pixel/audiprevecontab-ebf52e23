import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, MapPin, Phone, Mail, FileText, Calendar, Shield, Info, Briefcase, Globe } from "lucide-react";
import { formatDateBR, maskCNPJ } from "@/lib/utils";

interface EmpresaDetailsDialogProps {
  empresaId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const EmpresaDetailsDialog: React.FC<EmpresaDetailsDialogProps> = ({ empresaId, isOpen, onClose }) => {
  const { data: empresa, isLoading } = useQuery({
    queryKey: ["empresa_details", empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", empresaId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId && isOpen,
  });

  if (!isOpen) return null;

  const renderInfoItem = (icon: React.ReactNode, label: string, value: string | null | undefined) => (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold text-foreground bg-black/5 dark:bg-white/5 px-3 py-2 rounded-xl border border-border/10">
        {value || "Não informado"}
      </div>
    </div>
  );

  const getSituacaoColor = (situacao: string | null) => {
    switch (situacao?.toLowerCase()) {
      case 'ativa': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'baixada': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'inapta': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border border-border/50 shadow-2xl bg-background">
        <DialogHeader className="p-8 bg-muted/20 border-b border-border/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Building2 size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-card-foreground uppercase tracking-tight">
                {isLoading ? "Carregando..." : empresa?.nome_empresa || "Detalhes da Empresa"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                Dados Cadastrais da Empresa
              </p>
            </div>
            {!isLoading && empresa?.situacao && (
              <div className={`ml-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getSituacaoColor(empresa.situacao)}`}>
                {empresa.situacao}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">Buscando informações...</p>
            </div>
          ) : empresa ? (
            <div className="space-y-8">
              {/* Seção 1: Identificação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInfoItem(<Shield size={14} className="text-primary/50" />, "CNPJ", empresa.cnpj ? maskCNPJ(empresa.cnpj) : null)}
                {renderInfoItem(<Calendar size={14} className="text-primary/50" />, "Data de Abertura", empresa.data_abertura ? formatDateBR(empresa.data_abertura) : null)}
                {renderInfoItem(<Building2 size={14} className="text-primary/50" />, "Nome Fantasia", empresa.nome_fantasia)}
                {renderInfoItem(<Briefcase size={14} className="text-primary/50" />, "Regime Tributário", empresa.regime_tributario?.replace(/_/g, ' '))}
              </div>

              {/* Seção 2: Contato */}
              <div className="p-6 rounded-2xl bg-muted/20 border border-border/50">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 mb-4 flex items-center gap-2">
                  <Phone size={12} /> Informações de Contato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInfoItem(<Mail size={14} className="text-primary/50" />, "E-mail RFB", empresa.email_rfb)}
                  {renderInfoItem(<Phone size={14} className="text-primary/50" />, "Telefone RFB", empresa.telefone_rfb)}
                </div>
              </div>

              {/* Seção 3: Atividade */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInfoItem(<FileText size={14} className="text-primary/50" />, "Porte", empresa.porte_empresa?.toUpperCase())}
                  {renderInfoItem(<Shield size={14} className="text-primary/50" />, "Natureza Jurídica", empresa.natureza_juridica?.toUpperCase())}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    <Info size={14} className="text-primary/50" />
                    CNAE Principal
                  </div>
                  <div className="text-sm font-bold text-foreground bg-black/5 dark:bg-white/5 px-3 py-3 rounded-xl border border-border/10 flex flex-col gap-1">
                    <span className="text-primary">{empresa.cnae_fiscal}</span>
                    <span className="text-xs text-muted-foreground font-medium uppercase">{empresa.cnae_fiscal_descricao}</span>
                  </div>
                </div>
              </div>

              {/* Seção 4: Endereço */}
              {empresa.endereco && (
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
                    <MapPin size={12} /> Localização
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Logradouro</p>
                      <p className="text-sm font-bold">
                        {(empresa.endereco as any).logradouro}, {(empresa.endereco as any).numero}
                        {(empresa.endereco as any).complemento ? ` - ${(empresa.endereco as any).complemento}` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Bairro</p>
                      <p className="text-sm font-bold">{(empresa.endereco as any).bairro}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">CEP</p>
                      <p className="text-sm font-bold">{(empresa.endereco as any).cep}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Cidade/UF</p>
                      <p className="text-sm font-bold">{(empresa.endereco as any).cidade} / {(empresa.endereco as any).estado}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 opacity-50">
              <Info size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-bold uppercase tracking-widest">Empresa não encontrada</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-muted/10 border-t border-border/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-border/60 text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmpresaDetailsDialog;
