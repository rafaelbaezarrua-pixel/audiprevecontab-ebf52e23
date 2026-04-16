import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, Shield, History, Fingerprint, Lock, 
  Search, ShieldAlert, UserCheck, MoreVertical,
  Activity, Key, Gavel, Mail, Phone, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeaderSkeleton, TableSkeleton } from '@/components/PageSkeleton';

export const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Parte 5.1 - Lista de Usuários
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles' as any)
        .select(`
          *,
          user_consents(document_id, timestamp),
          audit_logs_count:audit_logs(count)
        `);
      if (error) throw error;
      return data;
    }
  });

  const filteredUsers = users?.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUser = users?.find(u => u.id === selectedUserId);

  if (isLoading) return <div className="p-8 space-y-8"><PageHeaderSkeleton /><TableSkeleton rows={8} /></div>;

  return (
    <div className="p-8 space-y-8 animate-fade-in relative max-w-[1400px] mx-auto">
      
      {/* Header com Metas de Conformidade */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Users size={24} />
             </div>
             <h1 className="header-title">Gestão de <span className="text-primary/90">Estratégica de Usuários</span></h1>
          </div>
          <p className="subtitle-premium">Controle de acesso RBAC, auditoria assinada e conformidade LGPD.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="BUSCAR USUÁRIO..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 h-14 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl outline-none text-[11px] font-bold uppercase tracking-widest focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <Button className="h-14 px-8 text-[11px] font-black uppercase tracking-widest gap-2">
            Novo Usuário +
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Tabela de Usuários (Painel L Esquerdo) */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-6">
          <div className="glass-card !p-0 overflow-hidden border-border/10 shadow-none">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-border/10">
                  <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Colaborador</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Perfil / RBAC</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Status LGPD</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Último Acesso</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 pr-8">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/5">
                {filteredUsers?.map(u => (
                  <tr 
                    key={u.id} 
                    onClick={() => setSelectedUserId(u.id)}
                    className={`group cursor-pointer hover:bg-primary/[0.02] transition-all ${selectedUserId === u.id ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-black text-sm border border-primary/10">
                          {u.full_name[0]}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-foreground text-[13px] uppercase tracking-tight group-hover:text-primary transition-colors">{u.full_name}</span>
                          <span className="text-[10px] text-muted-foreground/60 font-medium lowercase tracking-wide truncate">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border/10 text-[10px] font-black text-muted-foreground group-hover:text-primary transition-colors">
                         {u.role}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${u.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                         {u.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className="text-[10px] font-bold text-muted-foreground/40 uppercase">
                         {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Nunca'}
                       </span>
                    </td>
                    <td className="px-6 py-4 pr-8 text-right">
                       <MoreVertical size={16} className="ml-auto text-muted-foreground/20 group-hover:text-primary transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Painel de Detalhes Individual (Painel Direito) */}
        {selectedUser && (
          <div className="lg:col-span-12 xl:col-span-4 space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="glass-card p-0 border border-border/50 shadow-2xl overflow-hidden min-h-[700px] flex flex-col">
                <div className="p-8 border-b border-border/10 bg-primary/5">
                   <div className="flex items-start justify-between">
                     <div className="space-y-1">
                        <h2 className="text-xl font-black uppercase text-foreground">{selectedUser.full_name}</h2>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{selectedUser.role} • ID {selectedUser.id.split('-')[0]}</p>
                     </div>
                     <span className="w-14 h-14 rounded-2xl bg-white dark:bg-black/20 flex items-center justify-center text-primary shadow-sm border border-border/10"><Shield size={28} /></span>
                   </div>
                </div>

                <Tabs defaultValue="perfil" className="flex-1 flex flex-col">
                   <TabsList className="flex w-full bg-black/5 dark:bg-white/5 h-12 rounded-none p-0 border-b border-border/10">
                      <TabsTrigger value="perfil" className="flex-1 text-[9px] font-black uppercase tracking-widest">Dados</TabsTrigger>
                      <TabsTrigger value="sessao" className="flex-1 text-[9px] font-black uppercase tracking-widest">Segurança</TabsTrigger>
                      <TabsTrigger value="lgpd" className="flex-1 text-[9px] font-black uppercase tracking-widest">LGPD</TabsTrigger>
                      <TabsTrigger value="auditoria" className="flex-1 text-[9px] font-black uppercase tracking-widest">Trilha</TabsTrigger>
                   </TabsList>

                   <div className="flex-1 overflow-y-auto p-8">
                     
                     <TabsContent value="perfil" className="space-y-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 gap-4">
                           <div className="bg-black/[0.02] p-4 rounded-xl border border-border/10 space-y-1.5 transition-hover hover:border-primary/20">
                              <span className="text-[8px] font-black text-muted-foreground/40 uppercase flex items-center gap-2"><Mail size={10} /> Canal de Comunicação</span>
                              <p className="text-sm font-bold truncate">{selectedUser.email}</p>
                           </div>
                           <div className="bg-black/[0.02] p-4 rounded-xl border border-border/10 space-y-1.5">
                              <span className="text-[8px] font-black text-muted-foreground/40 uppercase flex items-center gap-2"><Briefcase size={10} /> Departamento / Cargo</span>
                              <p className="text-sm font-bold">{selectedUser.department} • {selectedUser.position || 'N/A'}</p>
                           </div>
                        </div>

                        <div className="pt-6 border-t border-border/10 space-y-4">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ações Rápidas</h4>
                           <div className="grid grid-cols-2 gap-3">
                              <Button variant="outline" className="h-12 text-[9px] font-black uppercase tracking-widest border-border/10 hover:border-primary/50">Bloquear Conta</Button>
                              <Button variant="outline" className="h-12 text-[9px] font-black uppercase tracking-widest border-border/10 hover:border-primary/50">Editar Perfil</Button>
                           </div>
                        </div>
                     </TabsContent>

                     <TabsContent value="sessao" className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                              <div className="flex items-center gap-3">
                                 <Fingerprint className="text-emerald-500" size={20} />
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-emerald-500 uppercase">MFA ATIVO</span>
                                    <span className="text-[8px] font-bold text-emerald-500/60 uppercase">Proteção de segundo fator validada</span>
                                 </div>
                              </div>
                              <Key size={16} className="text-emerald-500/40" />
                           </div>

                           <div className="space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Histórico de Login</h4>
                              {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-border/5">
                                   <div className="flex flex-col">
                                      <span className="text-xs font-bold text-foreground">172.16.2.201</span>
                                      <span className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest">Chrome/Windows • 16 de Abr, 2024</span>
                                   </div>
                                   <span className="text-[9px] font-black text-emerald-500">SUCESSO</span>
                                </div>
                              ))}
                           </div>

                           <Button className="w-full h-14 mt-4 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest gap-2">
                              Forçar Logout Global
                           </Button>
                        </div>
                     </TabsContent>

                     <TabsContent value="lgpd" className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Consentimentos Coletados</h4>
                           {selectedUser.user_consents?.length > 0 ? (
                             selectedUser.user_consents.map((c: any) => (
                               <div key={c.document_id} className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
                                  <div className="flex flex-col">
                                     <span className="text-[10px] font-black text-primary uppercase">Termos de Uso</span>
                                     <span className="text-[8px] font-bold text-muted-foreground uppercase">{new Date(c.timestamp).toLocaleString()}</span>
                                  </div>
                                  <CheckCircle2 size={16} className="text-primary" />
                               </div>
                             ))
                           ) : (
                             <div className="p-8 text-center bg-rose-500/5 border border-dashed border-rose-500/20 rounded-2xl">
                                <ShieldAlert size={32} className="mx-auto text-rose-500/40 mb-3" />
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-relaxed">Este usuário ainda não aceitou <br/>os termos de conformidade.</p>
                             </div>
                           )}
                           <Button variant="outline" className="w-full h-12 text-[9px] font-black uppercase tracking-widest mt-4">Manual de Aceite (PDF)</Button>
                        </div>
                     </TabsContent>

                     <TabsContent value="auditoria" className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                             Últimas Ações <Activity size={14} className="text-primary" />
                           </h4>
                           <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border/10">
                              {[
                                { a: 'LOGIN_SUCESSO', d: 'Acesso ao sistema via Dashboard' },
                                { a: 'FISCAL_EDIT', d: 'Alteração de imposto Simples Nacional' },
                                { a: 'CONFIG_USER', d: 'Alteração de perfil de visualização' }
                              ].map((l, i) => (
                                <div key={i} className="relative pl-8 space-y-1">
                                   <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-card border border-border/10 flex items-center justify-center">
                                      <div className="w-2 h-2 rounded-full bg-primary" />
                                   </div>
                                   <p className="text-[10px] font-black uppercase tracking-tight text-foreground">{l.a}</p>
                                   <p className="text-[9px] text-muted-foreground leading-relaxed">{l.d}</p>
                                </div>
                              ))}
                           </div>
                        </div>
                     </TabsContent>
                   </div>
                </Tabs>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

const CheckCircle2 = (props: any) => (
  <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
);
