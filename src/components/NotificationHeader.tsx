import React from "react";
import { Bell, Check, Trash2, ExternalLink, Inbox } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const NotificationHeader: React.FC = () => {
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        loading,
    } = useNotifications();
    const navigate = useNavigate();

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.recipient_id);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors relative">
                    <Bell size={18} className="text-muted-foreground" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-[10px] animate-in zoom-in"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4" align="end">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-semibold text-sm">Notificações</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={markAllAsRead}
                        >
                            Ler todas
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[350px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-4 text-center">
                            <Inbox size={32} className="mb-2 opacity-20" />
                            <p className="text-sm font-medium">Nenhuma notificação</p>
                            <p className="text-xs opacity-70">Você está em dia com tudo!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((n) => (
                                <div
                                    key={n.recipient_id}
                                    className={`group relative p-4 border-b border-border last:border-0 transition-colors cursor-pointer hover:bg-muted/50 ${!n.is_read ? "bg-primary/5" : ""
                                        }`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div className="pr-12">
                                        <p className={`text-sm ${!n.is_read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                                            {n.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                            {n.message}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                                            {formatDistanceToNow(new Date(n.created_at), {
                                                addSuffix: true,
                                                locale: ptBR,
                                            })}
                                        </p>
                                    </div>
                                    <div className="absolute top-4 right-4 flex flex-col gap-2 scale-0 group-hover:scale-100 transition-transform">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(n.recipient_id);
                                            }}
                                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        {!n.is_read && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(n.recipient_id);
                                                }}
                                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                                title="Marcar como lida"
                                            >
                                                <Check size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {!n.is_read && (
                                        <div className="absolute top-4 right-2 w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationHeader;
