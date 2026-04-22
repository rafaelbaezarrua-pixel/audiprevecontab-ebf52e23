import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AppConfig {
  system_title: string;
  system_logo_url: string;
  welcome_message: string;
}

const DEFAULT_CONFIG: AppConfig = {
  system_title: "Audipreve Contabilidade",
  system_logo_url: "",
  welcome_message: "Bem-vindo ao portal Audipreve",
};

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase.from("app_config").select("key, value");
      if (error) throw error;

      if (data) {
        const newConfig = { ...DEFAULT_CONFIG };
        data.forEach((item) => {
          if (item.key in newConfig) {
            (newConfig as any)[item.key] = item.value;
          }
        });
        setConfig(newConfig);
      }
    } catch (err) {
      console.error("Error fetching app config:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    try {
      const updates = Object.entries(newConfig).map(([key, value]) => ({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      }));

      // We use upsert to create or update keys
      const { error } = await supabase.from("app_config").upsert(updates, { onConflict: "key" });
      if (error) throw error;

      await fetchConfig();
      toast.success("Configuração do sistema atualizada!");
    } catch (err) {
      console.error("Error updating app config:", err);
      toast.error("Erro ao atualizar configuração.");
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return { config, updateConfig, loading, refreshConfig: fetchConfig };
}
