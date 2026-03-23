import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
    Send, User, Search, Filter,
    CheckCheck, Clock, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Message {
    id: string;
    sender_id: string;
    recipient_id: string;
    subject: string;
    content: string;
    created_at: string;
    read_at: string | null;
}

const MessagesPage: React.FC = () => {
    const { user, userData } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState("");
    const [search, setSearch] = useState("");

    const fetchMessages = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("internal_messages" as any)
            .select("*")
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching messages:", error);
        } else {
            setMessages(data as unknown as Message[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMessages();

        const channel = supabase
            .channel("messages_changes")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "internal_messages" },
                () => fetchMessages()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleSendMessage = async () => {
        if (!user || !newMessage.trim()) return;

        // For now, if client sends message, it goes to "admin" (placeholder)
        // If admin sends, it should pick a recipient. 
        // In this simplified version, we'll send to a fixed internal ID or just broadcast.
        const { error } = await supabase.from("internal_messages" as any).insert([
            {
                sender_id: user.id,
                recipient_id: userData?.isAdmin ? null : null, // Will be handled by admin response or fixed admin id
                empresa_id: userData?.empresaId,
                content: newMessage,
                subject: "Suporte",
                direcao: userData?.isAdmin ? "escritorio_para_cliente" : "cliente_para_escritorio"
            },
        ]);

        if (error) {
            toast.error("Erro ao enviar mensagem: " + error.message);
        } else {
            setNewMessage("");
            toast.success("Mensagem enviada!");
            fetchMessages();
        }
    };

    return (
        <div className="h-[calc(100vh-12rem)] flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <MessageSquare className="text-primary" /> Central de Mensagens
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Comunicação direta entre você e o escritório Audipreve.
                    </p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
                {/* Sidebar - Conversas/Filtros */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            placeholder="Buscar mensagens..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Button variant="ghost" className="w-full justify-start font-bold bg-primary/10 text-primary">
                            <MessageSquare size={18} className="mr-2" /> Todas as Mensagens
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                            <Clock size={18} className="mr-2" /> Não Lidas
                        </Button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="lg:col-span-3 flex flex-col bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
                    {/* Messages List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p className="animate-pulse">Carregando mensagens...</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                    <MessageSquare size={32} />
                                </div>
                                <p>Nenhuma mensagem trocada ainda.</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMine = msg.sender_id === user?.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[80%] flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                                            <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                                                <User size={16} />
                                            </div>
                                            <div className={`p-4 rounded-2xl text-sm ${isMine
                                                ? "bg-primary text-primary-foreground rounded-br-none"
                                                : "bg-muted text-foreground rounded-bl-none"
                                                }`}>
                                                <p>{msg.content}</p>
                                                <div className={`flex items-center gap-1 mt-2 text-[10px] ${isMine ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {isMine && (msg.read_at ? <CheckCheck size={12} /> : <CheckCheck size={12} className="opacity-50" />)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-border bg-card/50">
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Digite sua mensagem..."
                                className="flex-1 rounded-2xl"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim()}
                                className="rounded-2xl w-12 h-12 p-0 flex items-center justify-center"
                            >
                                <Send size={20} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessagesPage;
