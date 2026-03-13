
import React from "react";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Trash, 
  Inbox, 
  ShieldAlert, 
  RotateCcw,
  ArrowLeft
} from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const NotificacoesPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    loading,
  } = useNotifications();
  const navigate = useNavigate();

  const handleAllRead = async () => {
    await markAllAsRead();
    toast.success("Todas as notificações marcadas como lidas");
  };

  const handleDeleteAll = async () => {
    if (confirm("Deseja realmente excluir todas as notificações?")) {
      await deleteAllNotifications();
      toast.success("Todas as notificações excluídas");
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.recipient_id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Bell className="text-primary" /> Notificações
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Gerencie seus alertas e comunicações do sistema
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAllRead}
              className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2"
            >
              <CheckCheck size={14} /> Marcar todas
            </Button>
          )}
          {notifications.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteAll}
              className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2"
            >
              <Trash size={14} /> Excluir todas
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="card-premium p-0 overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-md">
        <ScrollArea className="h-[calc(100vh-250px)] min-h-[500px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold animate-pulse">Carregando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center opacity-50">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Inbox size={40} className="text-muted-foreground" />
              </div>
              <h3 className="text-lg font-black italic">Sua caixa está vazia</h3>
              <p className="text-sm max-w-xs mx-auto">
                Tudo em dia por aqui! Novas notificações aparecerão à medida que o sistema processar seus dados.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => {
                const isSystemAlert = n.type === "alerta_sistema";
                return (
                  <div 
                    key={n.recipient_id}
                    className={`group relative p-6 transition-all hover:bg-muted/30 cursor-pointer ${
                      !n.is_read ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                    }`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex gap-6 items-start">
                      <div className={`p-3 rounded-2xl shrink-0 ${
                        isSystemAlert ? "bg-destructive/10 text-destructive" : 
                        !n.is_read ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {isSystemAlert ? <ShieldAlert size={20} /> : <Bell size={20} />}
                      </div>

                      <div className="flex-1 space-y-1 pr-24">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-base tracking-tight ${!n.is_read ? "font-black" : "font-bold text-foreground/70"}`}>
                            {n.title}
                          </h4>
                          {!n.is_read && <Badge variant="default" className="text-[9px] px-1.5 py-0 uppercase">Nova</Badge>}
                        </div>
                        <p className={`text-sm leading-relaxed ${!n.is_read ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {n.message}
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                          <p className="text-[10px] font-black uppercase text-muted-foreground/60">
                            {format(new Date(n.created_at), "PPP 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-10 h-10 rounded-xl hover:bg-background shadow-sm border border-transparent hover:border-border"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (n.is_read) {
                              markAsUnread(n.recipient_id);
                            } else {
                              markAsRead(n.recipient_id);
                            }
                          }}
                          title={n.is_read ? "Marcar como não lida" : "Marcar como lida"}
                        >
                          {n.is_read ? <RotateCcw size={16} /> : <Check size={16} className="text-primary" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-10 h-10 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive shadow-sm border border-transparent hover:border-destructive/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.recipient_id);
                          }}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default NotificacoesPage;
