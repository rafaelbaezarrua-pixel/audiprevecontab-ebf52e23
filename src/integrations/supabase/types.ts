export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      certidoes: {
        Row: {
          arquivo_url: string | null
          created_at: string | null
          empresa_id: string
          id: string
          observacao: string | null
          tipo_certidao: string
          updated_at: string | null
          vencimento: string | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string | null
          empresa_id: string
          id?: string
          observacao?: string | null
          tipo_certidao: string
          updated_at?: string | null
          vencimento?: string | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          observacao?: string | null
          tipo_certidao?: string
          updated_at?: string | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certidoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados_digitais: {
        Row: {
          created_at: string | null
          data_vencimento: string | null
          empresa_id: string
          id: string
          observacao: string | null
          socio_responsavel_id: string | null
          tipo_emissao: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_vencimento?: string | null
          empresa_id: string
          id?: string
          observacao?: string | null
          socio_responsavel_id?: string | null
          tipo_emissao?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_vencimento?: string | null
          empresa_id?: string
          id?: string
          observacao?: string | null
          socio_responsavel_id?: string | null
          tipo_emissao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_digitais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_digitais_socio_responsavel_id_fkey"
            columns: ["socio_responsavel_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string | null
          data_abertura: string | null
          endereco: Json | null
          id: string
          natureza_juridica: string | null
          nome_empresa: string
          porte_empresa: string | null
          regime_tributario:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          situacao: Database["public"]["Enums"]["empresa_situacao"] | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          data_abertura?: string | null
          endereco?: Json | null
          id?: string
          natureza_juridica?: string | null
          nome_empresa: string
          porte_empresa?: string | null
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          situacao?: Database["public"]["Enums"]["empresa_situacao"] | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          data_abertura?: string | null
          endereco?: Json | null
          id?: string
          natureza_juridica?: string | null
          nome_empresa?: string
          porte_empresa?: string | null
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          situacao?: Database["public"]["Enums"]["empresa_situacao"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fiscal: {
        Row: {
          aliquota: number | null
          competencia: string | null
          created_at: string | null
          data_envio: string | null
          empresa_id: string
          forma_envio: string | null
          id: string
          observacoes: Json | null
          recebimento_arquivos: string | null
          status_guia: Database["public"]["Enums"]["guia_status"] | null
          tipo_nota: string | null
          updated_at: string | null
        }
        Insert: {
          aliquota?: number | null
          competencia?: string | null
          created_at?: string | null
          data_envio?: string | null
          empresa_id: string
          forma_envio?: string | null
          id?: string
          observacoes?: Json | null
          recebimento_arquivos?: string | null
          status_guia?: Database["public"]["Enums"]["guia_status"] | null
          tipo_nota?: string | null
          updated_at?: string | null
        }
        Update: {
          aliquota?: number | null
          competencia?: string | null
          created_at?: string | null
          data_envio?: string | null
          empresa_id?: string
          forma_envio?: string | null
          id?: string
          observacoes?: Json | null
          recebimento_arquivos?: string | null
          status_guia?: Database["public"]["Enums"]["guia_status"] | null
          tipo_nota?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      licencas: {
        Row: {
          empresa_id: string
          id: string
          numero_processo: string | null
          status: Database["public"]["Enums"]["licenca_tipo"] | null
          tipo_licenca: string
          updated_at: string | null
          vencimento: string | null
        }
        Insert: {
          empresa_id: string
          id?: string
          numero_processo?: string | null
          status?: Database["public"]["Enums"]["licenca_tipo"] | null
          tipo_licenca: string
          updated_at?: string | null
          vencimento?: string | null
        }
        Update: {
          empresa_id?: string
          id?: string
          numero_processo?: string | null
          status?: Database["public"]["Enums"]["licenca_tipo"] | null
          tipo_licenca?: string
          updated_at?: string | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licencas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelamentos: {
        Row: {
          cpf_pessoa_fisica: string | null
          created_at: string | null
          data_envio: string | null
          data_inicio: string | null
          empresa_id: string | null
          forma_envio: string | null
          id: string
          nome_pessoa_fisica: string | null
          previsao_termino: string | null
          qtd_parcelas: number | null
          tipo_parcelamento: string | null
          tipo_pessoa: string
          updated_at: string | null
        }
        Insert: {
          cpf_pessoa_fisica?: string | null
          created_at?: string | null
          data_envio?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          forma_envio?: string | null
          id?: string
          nome_pessoa_fisica?: string | null
          previsao_termino?: string | null
          qtd_parcelas?: number | null
          tipo_parcelamento?: string | null
          tipo_pessoa: string
          updated_at?: string | null
        }
        Update: {
          cpf_pessoa_fisica?: string | null
          created_at?: string | null
          data_envio?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          forma_envio?: string | null
          id?: string
          nome_pessoa_fisica?: string | null
          previsao_termino?: string | null
          qtd_parcelas?: number | null
          tipo_parcelamento?: string | null
          tipo_pessoa?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcelamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal: {
        Row: {
          competencia: string
          created_at: string | null
          dctf_web_gerada: boolean | null
          empresa_id: string
          fgts_data_envio: string | null
          fgts_status: Database["public"]["Enums"]["guia_status"] | null
          forma_envio: string | null
          id: string
          inss_data_envio: string | null
          inss_status: Database["public"]["Enums"]["guia_status"] | null
          possui_va: boolean | null
          possui_vt: boolean | null
          qtd_funcionarios: number | null
          qtd_pro_labore: number | null
          updated_at: string | null
          va_data_envio: string | null
          va_status: Database["public"]["Enums"]["guia_status"] | null
          vt_data_envio: string | null
          vt_status: Database["public"]["Enums"]["guia_status"] | null
        }
        Insert: {
          competencia: string
          created_at?: string | null
          dctf_web_gerada?: boolean | null
          empresa_id: string
          fgts_data_envio?: string | null
          fgts_status?: Database["public"]["Enums"]["guia_status"] | null
          forma_envio?: string | null
          id?: string
          inss_data_envio?: string | null
          inss_status?: Database["public"]["Enums"]["guia_status"] | null
          possui_va?: boolean | null
          possui_vt?: boolean | null
          qtd_funcionarios?: number | null
          qtd_pro_labore?: number | null
          updated_at?: string | null
          va_data_envio?: string | null
          va_status?: Database["public"]["Enums"]["guia_status"] | null
          vt_data_envio?: string | null
          vt_status?: Database["public"]["Enums"]["guia_status"] | null
        }
        Update: {
          competencia?: string
          created_at?: string | null
          dctf_web_gerada?: boolean | null
          empresa_id?: string
          fgts_data_envio?: string | null
          fgts_status?: Database["public"]["Enums"]["guia_status"] | null
          forma_envio?: string | null
          id?: string
          inss_data_envio?: string | null
          inss_status?: Database["public"]["Enums"]["guia_status"] | null
          possui_va?: boolean | null
          possui_vt?: boolean | null
          qtd_funcionarios?: number | null
          qtd_pro_labore?: number | null
          updated_at?: string | null
          va_data_envio?: string | null
          va_status?: Database["public"]["Enums"]["guia_status"] | null
          vt_data_envio?: string | null
          vt_status?: Database["public"]["Enums"]["guia_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      procuracoes: {
        Row: {
          created_at: string | null
          data_cadastro: string | null
          data_vencimento: string | null
          empresa_id: string
          id: string
          observacao: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_cadastro?: string | null
          data_vencimento?: string | null
          empresa_id: string
          id?: string
          observacao?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_cadastro?: string | null
          data_vencimento?: string | null
          empresa_id?: string
          id?: string
          observacao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procuracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          endereco: Json | null
          foto_url: string | null
          id: string
          nome_completo: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          endereco?: Json | null
          foto_url?: string | null
          id?: string
          nome_completo?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          endereco?: Json | null
          foto_url?: string | null
          id?: string
          nome_completo?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      socios: {
        Row: {
          administrador: boolean | null
          cpf: string | null
          created_at: string | null
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          administrador?: boolean | null
          cpf?: string | null
          created_at?: string | null
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          administrador?: boolean | null
          cpf?: string | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "socios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_permissions: {
        Row: {
          id: string
          module_name: string
          user_id: string
        }
        Insert: {
          id?: string
          module_name: string
          user_id: string
        }
        Update: {
          id?: string
          module_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      empresa_situacao: "ativa" | "paralisada" | "baixada"
      guia_status: "pendente" | "gerada" | "enviada"
      licenca_tipo:
        | "definitiva"
        | "dispensada"
        | "com_vencimento"
        | "em_processo"
      regime_tributario: "simples" | "lucro_presumido" | "lucro_real" | "mei"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      empresa_situacao: ["ativa", "paralisada", "baixada"],
      guia_status: ["pendente", "gerada", "enviada"],
      licenca_tipo: [
        "definitiva",
        "dispensada",
        "com_vencimento",
        "em_processo",
      ],
      regime_tributario: ["simples", "lucro_presumido", "lucro_real", "mei"],
    },
  },
} as const
