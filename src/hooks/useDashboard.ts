
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, format, startOfMonth, endOfMonth } from "date-fns";

import { ptBR } from "date-fns/locale";

export const useDashboard = () => {
  // 1. Basic Stats
  const { data: stats = { totalEmpresas: 0, ativas: 0, processosAtivos: 0, pendenciasFinanceiras: 0 }, isLoading: loadingStats } = useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const [{ count: total }, { count: ativas }, { count: processos }] = await Promise.all([
        supabase.from("empresas").select("*", { count: 'exact', head: true }),
        supabase.from("empresas").select("*", { count: 'exact', head: true }).eq("situacao", "ativa"),
        supabase.from("processos_societarios").select("*", { count: 'exact', head: true }).neq("status", "concluido")
      ]);

      const currentMonth = format(new Date(), "yyyy-MM");
      const { data: honorarios } = await supabase
        .from("honorarios_mensal")
        .select("valor_total")
        .eq("competencia", currentMonth)
        .eq("pago", false);
      
      const pendencias = honorarios?.reduce((acc, curr) => acc + (curr.valor_total || 0), 0) || 0;

      return {
        totalEmpresas: total || 0,
        ativas: ativas || 0,
        processosAtivos: processos || 0,
        pendenciasFinanceiras: pendencias
      };
    }
  });

  // 2. Revenue Trend (last 6 months)
  const { data: revenueTrend = [], isLoading: loadingTrend } = useQuery({
    queryKey: ["dashboard_revenue_trend"],
    queryFn: async () => {
      const months = Array.from({ length: 6 }).map((_, i) => format(subMonths(new Date(), 5 - i), "yyyy-MM"));
      
      const { data } = await supabase
        .from("honorarios_mensal")
        .select("competencia, valor_total, pago")
        .in("competencia", months);

      return months.map(m => {
        const monthData = data?.filter(d => d.competencia === m) || [];
        return {
          month: format(new Date(m + "-01"), "MMM", { locale: ptBR }),
          total: monthData.reduce((acc, curr) => acc + (curr.valor_total || 0), 0),
          pago: monthData.filter(d => d.pago).reduce((acc, curr) => acc + (curr.valor_total || 0), 0)
        };
      });
    }
  });


  // 4. Alerts (Certificates and Deadlines)
  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ["dashboard_alerts"],
    queryFn: async () => {
      const today = new Date();
      const next30Days = format(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

      const [certificados, agendamentos] = await Promise.all([
        supabase.from("certificados_digitais").select("*, empresas(nome_empresa)").lte("data_vencimento", next30Days),
        supabase.from("agendamentos").select("*").gte("data", format(today, "yyyy-MM-dd")).lte("data", format(today, "yyyy-MM-dd")).eq("status", "pendente")
      ]);

      const combined = [
        ...(certificados.data || []).map(c => ({
          id: c.id,
          type: 'expiring' as const,
          title: 'Certificado Expirando',
          description: `${(c.empresas as any)?.nome_empresa || 'Empresa'} - Vence em ${format(new Date(c.data_vencimento!), "dd/MM")}`,
          date: c.data_vencimento
        })),
        ...(agendamentos.data || []).map(a => ({
          id: a.id,
          type: 'deadline' as const,
          title: 'Tarefa Hoje',
          description: a.assunto,
          date: a.data
        }))
      ];

      return combined.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }
  });

  return {
    stats,
    revenueTrend,
    alerts,
    loading: loadingStats || loadingTrend || loadingAlerts
  };
};
