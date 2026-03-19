
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, format, startOfMonth, endOfMonth } from "date-fns";

import { ptBR } from "date-fns/locale";

export const useDashboard = (userId?: string) => {
  // 1. Basic Stats
  const { data: stats = { totalEmpresas: 0, ativas: 0, processosAtivos: 0 }, isLoading: loadingStats } = useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const [{ count: total }, { count: ativas }, { count: processos }] = await Promise.all([
        supabase.from("empresas").select("*", { count: "exact", head: true }),
        supabase.from("empresas").select("*", { count: "exact", head: true }).eq("situacao", "ativa"),
        supabase.from("processos_societarios").select("*", { count: "exact", head: true }).neq("status", "concluido"),
      ]);

      return {
        totalEmpresas: total || 0,
        ativas: ativas || 0,
        processosAtivos: processos || 0,
      };
    },
  });

  // 1.5. Analytics Data (Charts)
  const { data: analytics = { regimes: [], processos: [] }, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["dashboard_analytics"],
    queryFn: async () => {
      // Fetch distribution of Regimes Tributários for Active Companies
      const { data: empresas } = await supabase
        .from("empresas")
        .select("regime_tributario")
        .eq("situacao", "ativa");
        
      const regimeCount: Record<string, number> = {
        'Simples Nacional': 0,
        'Lucro Presumido': 0,
        'Lucro Real': 0,
        'MEI': 0,
        'Outros': 0
      };

      empresas?.forEach(emp => {
        if (emp.regime_tributario === 'simples') regimeCount['Simples Nacional']++;
        else if (emp.regime_tributario === 'lucro_presumido') regimeCount['Lucro Presumido']++;
        else if (emp.regime_tributario === 'lucro_real') regimeCount['Lucro Real']++;
        else if (emp.regime_tributario === 'mei') regimeCount['MEI']++;
        else regimeCount['Outros']++;
      });

      const regimesData = Object.entries(regimeCount)
        .filter(([_, count]) => count > 0)
        .map(([name, value]) => ({ name, value }));

      // Fetch distribution of Processos Societários statuses
      const { data: procData } = await supabase
        .from("processos_societarios")
        .select("status");

      const procCount: Record<string, number> = {
        'Pendentes': 0,
        'Em Andamento': 0,
        'Em Exigência': 0,
        'Concluídos': 0
      };

      procData?.forEach(p => {
        if ((p as any).status === 'concluido' || (p as any).foi_arquivado) procCount['Concluídos']++;
        else if ((p as any).em_exigencia) procCount['Em Exigência']++;
        else if ((p as any).status === 'em_andamento') procCount['Em Andamento']++;
        else procCount['Pendentes']++;
      });

      const processosData = Object.entries(procCount).map(([name, value]) => ({ name, value }));

      return {
        regimes: regimesData,
        processos: processosData
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
    queryKey: ["dashboard_alerts", userId],
    queryFn: async () => {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const next30Days = format(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

      const certificatesQuery = supabase.from("certificados_digitais").select("*, empresas(nome_empresa)").lte("data_vencimento", next30Days);
      
      let agendamentosQuery = supabase.from("agendamentos")
        .select("*")
        .eq("data", todayStr)
        .eq("status", "pendente");
      
      if (userId) {
        agendamentosQuery = agendamentosQuery.eq("usuario_id", userId);
      }

      const [certificados, agendamentos] = await Promise.all([
        certificatesQuery,
        agendamentosQuery
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
    },
    enabled: !!userId || true // Enable even if no userId (it will just not filter if not passed, but we pass it)
  });

  return {
    stats,
    analytics,
    revenueTrend,
    alerts,
    loading: loadingStats || loadingAnalytics || loadingTrend || loadingAlerts
  };
};
