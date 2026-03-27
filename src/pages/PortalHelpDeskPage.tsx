import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Plus, Send, Clock, CheckCircle2, AlertCircle, ArrowLeft, Search, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Ticket {
  id: string;
  assunto: string;
  categoria: string;
  status: 'aberto' | 'em_atendimento' | 'concluido' | 'fechado';
  prioridade: 'baixa' | 'media' | 'alta';
  created_at: string;
}

const PortalHelpDeskPage: React.FC = () => {
    const { userData, user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [newTicket, setNewTicket] = useState({ assunto: "", categoria: "Suporte", prioridade: "media" });

    useEffect(() => {
        loadTickets();
    }, [userData?.empresaId]);

    const loadTickets = async () => {
        if (!userData?.empresaId) return;
        setLoading(true);
        const { data } = await supabase
            .from('tickets' as any)
            .select('*')
            .eq('empresa_id', userData.empresaId)
            .order('created_at', { ascending: false });
        if (data) setTickets(data as any);
        setLoading(false);
    };

    const loadMessages = async (ticketId: string) => {
        const { data } = await supabase
            .from('ticket_messages' as any)
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });
        if (data) setMessages(data);
    };

    const handleCreateTicket = async () => {
        if (!newTicket.assunto) return toast.error("Assunto é obrigatório");
        try {
            const { data, error } = await supabase
                .from('tickets' as any)
                .insert([{
                    ...newTicket,
                    empresa_id: userData?.empresaId,
                    usuario_id: user?.id,
                    status: 'aberto'
                }])
                .select()
                .single();
            if (error) throw error;
            setTickets([data as any, ...tickets]);
            setIsCreating(false);
            setNewTicket({ assunto: "", categoria: "Suporte", prioridade: "media" });
            toast.success("Ticket aberto com sucesso!");
        } catch (err: any) { toast.error(err.message); }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedTicket) return;
        try {
            const { data, error } = await supabase
                .from('ticket_messages' as any)
                .insert([{
                    ticket_id: selectedTicket.id,
                    usuario_id: user?.id,
                    mensagem: newMessage,
                    is_admin_reply: false
                }])
                .select()
                .single();
            if (error) throw error;
            setMessages([...messages, data]);
            setNewMessage("");
        } catch (err: any) { toast.error(err.message); }
    };

    if (selectedTicket) {
        return (
            <div className="flex flex-col h-[calc(100vh-140px)] animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium">
                        <ArrowLeft size={18} /> Voltar aos Tickets
                    </button>
                    <div className="flex items-center gap-2">
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                             selectedTicket.status === 'aberto' ? 'bg-blue-500/10 text-blue-500' : 
                             selectedTicket.status === 'em_atendimento' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
                         }`}>{selectedTicket.status}</span>
                    </div>
                </div>

                <div className="module-card flex-1 flex flex-col p-0 overflow-hidden border-border/40 shadow-sm">
                    <div className="p-4 border-b border-border bg-muted/20">
                        <h2 className="text-lg font-black tracking-tight">{selectedTicket.assunto}</h2>
                        <div className="text-xs text-muted-foreground flex gap-3 mt-1 uppercase font-bold tracking-wider">
                            <span>#{selectedTicket.id.slice(0, 8)}</span>
                            <span>•</span>
                            <span>{selectedTicket.categoria}</span>
                            <span>•</span>
                            <span>{format(new Date(selectedTicket.created_at), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/5">
                        {messages.length === 0 ? (
                            <p className="text-center text-muted-foreground italic py-12">Aguardando mensagens...</p>
                        ) : (
                            messages.map((m, idx) => (
                                <div key={idx} className={`flex ${m.is_admin_reply ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                                        m.is_admin_reply ? 'bg-card border border-border rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'
                                    }`}>
                                        {m.is_admin_reply && <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Audipreve Contábil</p>}
                                        <p className="text-sm leading-relaxed">{m.mensagem}</p>
                                        <p className={`text-[9px] mt-2 opacity-60 text-right font-medium`}>{format(new Date(m.created_at), 'HH:mm')}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-border bg-muted/10">
                        <div className="flex gap-2">
                            <input 
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Digite sua mensagem..." 
                                className="flex-1 px-4 py-2 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                            />
                            <button onClick={handleSendMessage} className="p-3 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md">
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black text-foreground tracking-tight">Help Desk Interno</h1>
                    <p className="text-sm text-muted-foreground font-medium">Abra tickets de suporte para conversar com nosso time.</p>
                </div>
                {!isCreating && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm"
                    >
                        <Plus size={18} /> Novo Ticket
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="module-card animate-in zoom-in-95">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-black text-lg tracking-tight">Novo Ticket de Suporte</h2>
                        <button onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Assunto / Tópico</label>
                            <input 
                                value={newTicket.assunto}
                                onChange={e => setNewTicket({...newTicket, assunto: e.target.value})}
                                className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                                placeholder="Ex: Dúvida sobre a folha de pagamento de Março"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Categoria</label>
                            <select 
                                value={newTicket.categoria}
                                onChange={e => setNewTicket({...newTicket, categoria: e.target.value})}
                                className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                            >
                                <option>Geral</option>
                                <option>Fiscal</option>
                                <option>Pessoal</option>
                                <option>Financeiro</option>
                                <option>Societário</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Prioridade</label>
                            <select 
                                value={newTicket.prioridade}
                                onChange={e => setNewTicket({...newTicket, prioridade: e.target.value})}
                                className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                            >
                                <option value="baixa">Baixa</option>
                                <option value="media">Média</option>
                                <option value="alta">Alta</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button onClick={() => setIsCreating(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-muted transition-all">Cancelar</button>
                        <button onClick={handleCreateTicket} className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all">Abrir Ticket</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="py-20 text-center text-muted-foreground animate-pulse font-medium">Carregando seus tickets...</div>
                ) : tickets.length === 0 ? (
                    <div className="module-card flex flex-col items-center justify-center py-20 text-center border-dashed border-2">
                        <MessageSquare size={48} className="text-muted-foreground opacity-10 mb-4" />
                        <h3 className="font-bold text-foreground">Ainda não há tickets</h3>
                        <p className="text-sm text-muted-foreground mt-1">Quando você precisar de ajuda, abra um ticket aqui.</p>
                    </div>
                ) : (
                    tickets.map(t => (
                        <div 
                            key={t.id} 
                            onClick={() => {
                                setSelectedTicket(t);
                                loadMessages(t.id);
                            }}
                            className="module-card group hover:border-primary/50 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 py-6"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-2xl ${
                                    t.status === 'aberto' ? 'bg-blue-500/10 text-blue-500' : 
                                    t.status === 'em_atendimento' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
                                }`}>
                                    <MessageSquare size={24} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">{t.assunto}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.categoria}</span>
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <span className="text-[10px] font-bold text-muted-foreground">{format(new Date(t.created_at), 'dd/MM/yyyy')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                        t.status === 'aberto' ? 'bg-blue-100 text-blue-600' : 
                                        t.status === 'em_atendimento' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                                    }`}>
                                        {t.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Prioridade {t.prioridade}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PortalHelpDeskPage;
