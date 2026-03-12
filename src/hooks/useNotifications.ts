import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
    id: string;
    recipient_id: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    is_read: boolean;
    created_at: string;
    metadata?: any;
}

export const useNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const isFetchingRef = useRef(false);

    const fetchNotifications = async () => {
        if (!user || isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            const { data, error } = await (supabase as any)
                .from("notification_recipients")
                .select(`
            id,
            is_read,
            created_at,
            notifications (
            id,
            title,
            message,
            type,
            link,
            metadata
            )
        `)
                .eq("user_id", user.id)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false });

            if (error && error.name !== 'AbortError') {
                console.error("Error fetching notifications:", error);
                return;
            }

            const formatted: Notification[] = (data || [])
                .filter((item: any) => item.notifications !== null)
                .map((item: any) => ({
                    id: item.notifications.id,
                    recipient_id: item.id,
                    title: item.notifications.title,
                    message: item.notifications.message,
                    type: item.notifications.type,
                    link: item.notifications.link,
                    is_read: item.is_read,
                    created_at: item.created_at,
                    metadata: item.notifications.metadata,
                }));

            setNotifications(formatted);
            setUnreadCount(formatted.filter((n) => !n.is_read).length);
        } finally {
            setLoading(false);
            setTimeout(() => { isFetchingRef.current = false; }, 1000);
        }
    };

    useEffect(() => {
        fetchNotifications();

        if (!user) return;

        // Realtime subscription
        const channel = (supabase as any)
            .channel("public:notification_recipients")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notification_recipients",
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const markAsRead = async (recipientId: string) => {
        const { error } = await (supabase as any)
            .from("notification_recipients")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("id", recipientId);

        if (error) console.error("Error marking notification as read:", error);
        else fetchNotifications();
    };

    const markAsUnread = async (recipientId: string) => {
        const { error } = await (supabase as any)
            .from("notification_recipients")
            .update({ is_read: false, read_at: null })
            .eq("id", recipientId);

        if (error) console.error("Error marking notification as unread:", error);
        else fetchNotifications();
    };

    const markAllAsRead = async () => {
        if (!user) return;
        const { error } = await (supabase as any)
            .from("notification_recipients")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .eq("is_read", false);

        if (error) console.error("Error marking all notifications as read:", error);
        else fetchNotifications();
    };

    const deleteNotification = async (recipientId: string) => {
        const { error } = await (supabase as any)
            .from("notification_recipients")
            .update({ is_deleted: true })
            .eq("id", recipientId);

        if (error) console.error("Error deleting notification:", error);
        else fetchNotifications();
    };

    const deleteAllNotifications = async () => {
        if (!user) return;
        const { error } = await (supabase as any)
            .from("notification_recipients")
            .update({ is_deleted: true })
            .eq("user_id", user.id);

        if (error) console.error("Error deleting all notifications:", error);
        else fetchNotifications();
    };

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        refresh: fetchNotifications,
    };
};
