import React, { useState } from "react";
import { UserPermissions } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    User, Shield, Key, FileCheck, History, 
    Mail, Phone, Building, Briefcase, 
    Lock, Unlock, RefreshCcw, LogOut,
    Search, Filter, Download
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserProfileDetailsProps {
    user: any;
    onClose: () => void;
    onUpdate: () => void;
}

export const UserProfileDetails: React.FC<UserProfileDetailsProps> = ({ user, onClose, onUpdate }) => {
    return (
        <div className="flex flex-col h-full bg-card font-ubuntu">
            <div className="p-8 border-b border-border bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <User size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-card-foreground uppercase tracking-tight">{user.nome_completo || "Usuário"}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                                {user.role?.toUpperCase() || "USUÁRIO"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40">
                                ID: {user.user_id?.slice(0, 8)}...
                            </span>
                        </div>
                    </div>
                </div>
                <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                    FECHAR PAINEL
                </Button>
            </div>

            <Tabs defaultValue="dados" className="flex-1 flex flex-col min-h-0">
                <div className="px-8 bg-muted/10 border-b border-border">
                    <TabsList className="bg-transparent h-16 gap-8">
                        <TabsTrigger value="dados" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                            Dados Pessoais
                        </TabsTrigger>
                        <TabsTrigger value="seguranca" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                            Segurança e Acesso
                        </TabsTrigger>
                        <TabsTrigger value="termos" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                            Termos e Consentimentos
                        </TabsTrigger>
                        <TabsTrigger value="auditoria" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                            Auditoria
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-8 max-w-4xl mx-auto space-y-10">
                            
                            <TabsContent value="dados" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            <Mail size={14} /> Identidade Digital
                                        </h3>
                                        <div className="space-y-4 bg-muted/10 p-6 rounded-3xl border border-border/50">
                                            <div>
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">E-mail Corporativo</p>
                                                <p className="text-sm font-bold text-card-foreground">{user.email || "Não informado"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">CPF / Identificador</p>
                                                <p className="text-sm font-bold text-card-foreground">{user.cpf || "Não informado"}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            <Building size={14} /> Estrutura Organizacional
                                        </h3>
                                        <div className="space-y-4 bg-muted/10 p-6 rounded-3xl border border-border/50">
                                            <div>
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Departamento</p>
                                                <p className="text-sm font-bold text-card-foreground">{user.departamento || "Não informado"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Cargo / Função</p>
                                                <p className="text-sm font-bold text-card-foreground">{user.cargo || "Não informado"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div className="flex justify-end pt-8 border-t border-border">
                                    <Button className="button-premium px-10 h-14 text-[10px] font-black uppercase tracking-widest">
                                        EDITAR DADOS PESSOAIS
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="seguranca" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-card border border-border rounded-3xl p-6 space-y-2 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status da Conta</p>
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        </div>
                                        <p className="text-lg font-black text-emerald-500 uppercase tracking-tight">Ativo</p>
                                    </div>
                                    <div className="bg-card border border-border rounded-3xl p-6 space-y-2 shadow-sm">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MFA (2FA)</p>
                                        <p className="text-lg font-black text-card-foreground uppercase tracking-tight">Desativado</p>
                                    </div>
                                    <div className="bg-card border border-border rounded-3xl p-6 space-y-2 shadow-sm">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Falhas de Login</p>
                                        <p className="text-lg font-black text-card-foreground uppercase tracking-tight">0 Tentativas</p>
                                    </div>
                                </section>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Shield size={14} /> Ações de Segurança
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <Button variant="outline" className="h-20 rounded-2xl flex flex-col gap-2 border-primary/20 hover:bg-primary/5 transition-all group">
                                            <RefreshCcw size={18} className="text-primary group-hover:rotate-180 transition-transform duration-500" />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Resetar Senha</span>
                                        </Button>
                                        <Button variant="outline" className="h-20 rounded-2xl flex flex-col gap-2 border-amber-500/20 hover:bg-amber-500/5 text-amber-500 transition-all">
                                            <Lock size={18} />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Bloquear Acesso</span>
                                        </Button>
                                        <Button variant="outline" className="h-20 rounded-2xl flex flex-col gap-2 border-rose-500/20 hover:bg-rose-500/5 text-rose-500 transition-all">
                                            <LogOut size={18} />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Encerrar Sessões</span>
                                        </Button>
                                        <Button variant="outline" className="h-20 rounded-2xl flex flex-col gap-2 border-blue-500/20 hover:bg-blue-500/5 text-blue-500 transition-all">
                                            <History size={18} />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Histórico Login</span>
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="termos" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            <FileCheck size={14} /> Histórico de Consentimento LGPD
                                        </h3>
                                        <Button variant="ghost" className="text-[9px] font-black uppercase tracking-widest text-primary">
                                            EXIGIR NOVO ACEITE
                                        </Button>
                                    </div>
                                    
                                    <div className="border border-border rounded-3xl overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-muted/10 border-b border-border">
                                                <tr>
                                                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Documento</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Versão</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Data Aceite</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">IP Origem</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50">
                                                <tr>
                                                    <td className="px-6 py-5 text-[10px] font-bold text-card-foreground">Termos de Uso</td>
                                                    <td className="px-6 py-5 text-[10px] font-bold text-primary">v1.2</td>
                                                    <td className="px-6 py-5 text-[10px] text-muted-foreground">15/04/2026 14:32</td>
                                                    <td className="px-6 py-5 text-[10px] font-mono text-muted-foreground/60">177.34.12.8</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-6 py-5 text-[10px] font-bold text-card-foreground">Política de Privacidade</td>
                                                    <td className="px-6 py-5 text-[10px] font-bold text-primary">v2.0</td>
                                                    <td className="px-6 py-5 text-[10px] text-muted-foreground">15/04/2026 14:32</td>
                                                    <td className="px-6 py-5 text-[10px] font-mono text-muted-foreground/60">177.34.12.8</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="auditoria" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-muted/10 rounded-3xl p-8 border border-dashed border-border flex flex-col items-center justify-center text-center gap-4">
                                    <History size={48} className="text-muted-foreground/20" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Relatório de Atividade Disponível</p>
                                        <p className="text-[10px] text-muted-foreground/60 font-medium">Você pode exportar a trilha de auditoria completa deste usuário para fins de fiscalização ou perícia.</p>
                                    </div>
                                    <Button className="button-premium h-14 px-10 gap-3 text-[10px] font-black uppercase tracking-widest">
                                        <Download size={16} /> EXPORTAR TRILHA DE AUDITORIA
                                    </Button>
                                </div>
                            </TabsContent>

                        </div>
                    </ScrollArea>
                </div>
            </Tabs>
        </div>
    );
};
