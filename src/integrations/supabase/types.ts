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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      documentos_assinaturas: {
        Row: {
          assinatura_pkcs7: string | null
          certificado_info: Json | null
          created_at: string
          criado_por: string | null
          data_assinatura: string | null
          empresa_id: string | null
          file_url: string
          id: string
          status: Database["public"]["Enums"]["status_assinatura"]
          tipo_documento: string
          titulo: string
          updated_at: string
        }
        Insert: {
          assinatura_pkcs7?: string | null
          certificado_info?: Json | null
          created_at?: string
          criado_por?: string | null
          data_assinatura?: string | null
          empresa_id?: string | null
          file_url: string
          id?: string
          status?: Database["public"]["Enums"]["status_assinatura"]
          tipo_documento?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          assinatura_pkcs7?: string | null
          certificado_info?: Json | null
          created_at?: string
          criado_por?: string | null
          data_assinatura?: string | null
          empresa_id?: string | null
          file_url?: string
          id?: string
          status?: Database["public"]["Enums"]["status_assinatura"]
          tipo_documento?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_assinaturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      },
      agendamentos: {
        Row: {
          arquivado: boolean | null
          assunto: string
          competencia: string | null
          created_at: string | null
          criado_por: string | null
          data: string
          horario: string
          id: string
          informacoes_adicionais: string | null
          status: string | null
          usuario_id: string
        }
        Insert: {
          arquivado?: boolean | null
          assunto: string
          competencia?: string | null
          created_at?: string | null
          criado_por?: string | null
          data: string
          horario: string
          id?: string
          informacoes_adicionais?: string | null
          status?: string | null
          usuario_id: string
        }
        Update: {
          arquivado?: boolean | null
          assunto?: string
          competencia?: string | null
          created_at?: string | null
          criado_por?: string | null
          data?: string
          horario?: string
          id?: string
          informacoes_adicionais?: string | null
          status?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
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
          empresa_id: string | null
          id: string
          observacao: string | null
          tipo_certidao: string | null
          updated_at: string | null
          vencimento: string | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
          tipo_certidao?: string | null
          updated_at?: string | null
          vencimento?: string | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
          tipo_certidao?: string | null
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
          data_vencimento: string | null
          empresa_id: string | null
          id: string
          observacao: string | null
        }
        Insert: {
          data_vencimento?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
        }
        Update: {
          data_vencimento?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_digitais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      declaracoes_anuais: {
        Row: {
          ano: number | null
          empresa_id: string | null
          enviada: boolean | null
          id: string
          tipo_declaracao: string | null
        }
        Insert: {
          ano?: number | null
          empresa_id?: string | null
          enviada?: boolean | null
          id?: string
          tipo_declaracao?: string | null
        }
        Update: {
          ano?: number | null
          empresa_id?: string | null
          enviada?: boolean | null
          id?: string
          tipo_declaracao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "declaracoes_anuais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      declaracoes_irpf: {
        Row: {
          ano: number | null
          id: string
          socio_id: string | null
          transmitida: boolean | null
        }
        Insert: {
          ano?: number | null
          id?: string
          socio_id?: string | null
          transmitida?: boolean | null
        }
        Update: {
          ano?: number | null
          id?: string
          socio_id?: string | null
          transmitida?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "declaracoes_irpf_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_acessos: {
        Row: {
          empresa_id: string
          id: string
          modulos_permitidos: string[]
          user_id: string
        }
        Insert: {
          empresa_id: string
          id?: string
          modulos_permitidos?: string[]
          user_id: string
        }
        Update: {
          empresa_id?: string
          id?: string
          modulos_permitidos?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_acessos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
          modulos_ativos: string[] | null
          natureza_juridica: string | null
          nome_empresa: string
          porte_empresa: string | null
          regime_tributario:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          situacao: Database["public"]["Enums"]["empresa_situacao"] | null
          updated_at: string | null
          nome_fantasia: string | null
          capital_social: number | null
          cnae_fiscal: number | null
          cnae_fiscal_descricao: string | null
          email_rfb: string | null
          telefone_rfb: string | null
          qsa: Json | null
          info_rfb_completa: Json | null
          data_exclusao_simples: string | null
          data_exclusao_simei: string | null
          opcao_pelo_simples: boolean | null
          data_opcao_pelo_simples: string | null
          opcao_pelo_mei: boolean | null
          data_opcao_pelo_mei: string | null
          porte_rfb: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          data_abertura?: string | null
          endereco?: Json | null
          id?: string
          modulos_ativos?: string[] | null
          natureza_juridica?: string | null
          nome_empresa: string
          porte_empresa?: string | null
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          situacao?: Database["public"]["Enums"]["empresa_situacao"] | null
          updated_at?: string | null
          nome_fantasia?: string | null
          capital_social?: number | null
          cnae_fiscal?: number | null
          cnae_fiscal_descricao?: string | null
          email_rfb?: string | null
          telefone_rfb?: string | null
          qsa?: Json | null
          info_rfb_completa?: Json | null
          data_exclusao_simples?: string | null
          data_exclusao_simei?: string | null
          opcao_pelo_simples?: boolean | null
          data_opcao_pelo_simples?: string | null
          opcao_pelo_mei?: boolean | null
          data_opcao_pelo_mei?: string | null
          porte_rfb?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          data_abertura?: string | null
          endereco?: Json | null
          id?: string
          modulos_ativos?: string[] | null
          natureza_juridica?: string | null
          nome_empresa?: string
          porte_empresa?: string | null
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          situacao?: Database["public"]["Enums"]["empresa_situacao"] | null
          updated_at?: string | null
          nome_fantasia?: string | null
          capital_social?: number | null
          cnae_fiscal?: number | null
          cnae_fiscal_descricao?: string | null
          email_rfb?: string | null
          telefone_rfb?: string | null
          qsa?: Json | null
          info_rfb_completa?: Json | null
          data_exclusao_simples?: string | null
          data_exclusao_simei?: string | null
          opcao_pelo_simples?: boolean | null
          data_opcao_pelo_simples?: string | null
          opcao_pelo_mei?: boolean | null
          data_opcao_pelo_mei?: string | null
          porte_rfb?: string | null
        }
        Relationships: []
      }
      faturamentos: {
        Row: {
          competencia: string
          created_at: string | null
          criado_por: string | null
          data_emissao: string
          data_vencimento: string
          id: string
          nome_cliente: string
          valor: number
        }
        Insert: {
          competencia: string
          created_at?: string | null
          criado_por?: string | null
          data_emissao: string
          data_vencimento: string
          id?: string
          nome_cliente: string
          valor: number
        }
        Update: {
          competencia?: string
          created_at?: string | null
          criado_por?: string | null
          data_emissao?: string
          data_vencimento?: string
          id?: string
          nome_cliente?: string
          valor?: number
        }
        Relationships: []
      }
      fiscal: {
        Row: {
          aliquota: number | null
          aliquota_cbs: number | null
          aliquota_cofins: number | null
          aliquota_csll: number | null
          aliquota_ibs: number | null
          aliquota_icms: number | null
          aliquota_irpj: number | null
          aliquota_iss: number | null
          aliquota_pis: number | null
          cbs_data_envio: string | null
          cbs_status: Database["public"]["Enums"]["guia_status"] | null
          competencia: string | null
          created_at: string | null
          data_envio: string | null
          empresa_id: string | null
          forma_envio: string | null
          ibs_data_envio: string | null
          ibs_status: Database["public"]["Enums"]["guia_status"] | null
          icms_data_envio: string | null
          icms_status: Database["public"]["Enums"]["guia_status"] | null
          id: string
          irpj_csll_data_envio: string | null
          irpj_csll_status: Database["public"]["Enums"]["guia_status"] | null
          iss_data_envio: string | null
          iss_status: Database["public"]["Enums"]["guia_status"] | null
          observacoes: Json | null
          pis_cofins_data_envio: string | null
          pis_cofins_status: Database["public"]["Enums"]["guia_status"] | null
          ramo_empresarial: string | null
          recebimento_arquivos: string | null
          status_guia: Database["public"]["Enums"]["guia_status"] | null
          tipo_nota: string | null
        }
        Insert: {
          aliquota?: number | null
          aliquota_cbs?: number | null
          aliquota_cofins?: number | null
          aliquota_csll?: number | null
          aliquota_ibs?: number | null
          aliquota_icms?: number | null
          aliquota_irpj?: number | null
          aliquota_iss?: number | null
          aliquota_pis?: number | null
          cbs_data_envio?: string | null
          cbs_status?: Database["public"]["Enums"]["guia_status"] | null
          competencia?: string | null
          created_at?: string | null
          data_envio?: string | null
          empresa_id?: string | null
          forma_envio?: string | null
          ibs_data_envio?: string | null
          ibs_status?: Database["public"]["Enums"]["guia_status"] | null
          icms_data_envio?: string | null
          icms_status?: Database["public"]["Enums"]["guia_status"] | null
          id?: string
          irpj_csll_data_envio?: string | null
          irpj_csll_status?: Database["public"]["Enums"]["guia_status"] | null
          iss_data_envio?: string | null
          iss_status?: Database["public"]["Enums"]["guia_status"] | null
          observacoes?: Json | null
          pis_cofins_data_envio?: string | null
          pis_cofins_status?: Database["public"]["Enums"]["guia_status"] | null
          ramo_empresarial?: string | null
          recebimento_arquivos?: string | null
          status_guia?: Database["public"]["Enums"]["guia_status"] | null
          tipo_nota?: string | null
        }
        Update: {
          aliquota?: number | null
          aliquota_cbs?: number | null
          aliquota_cofins?: number | null
          aliquota_csll?: number | null
          aliquota_ibs?: number | null
          aliquota_icms?: number | null
          aliquota_irpj?: number | null
          aliquota_iss?: number | null
          aliquota_pis?: number | null
          cbs_data_envio?: string | null
          cbs_status?: Database["public"]["Enums"]["guia_status"] | null
          competencia?: string | null
          created_at?: string | null
          data_envio?: string | null
          empresa_id?: string | null
          forma_envio?: string | null
          ibs_data_envio?: string | null
          ibs_status?: Database["public"]["Enums"]["guia_status"] | null
          icms_data_envio?: string | null
          icms_status?: Database["public"]["Enums"]["guia_status"] | null
          id?: string
          irpj_csll_data_envio?: string | null
          irpj_csll_status?: Database["public"]["Enums"]["guia_status"] | null
          iss_data_envio?: string | null
          iss_status?: Database["public"]["Enums"]["guia_status"] | null
          observacoes?: Json | null
          pis_cofins_data_envio?: string | null
          pis_cofins_status?: Database["public"]["Enums"]["guia_status"] | null
          ramo_empresarial?: string | null
          recebimento_arquivos?: string | null
          status_guia?: Database["public"]["Enums"]["guia_status"] | null
          tipo_nota?: string | null
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
      honorarios_config: {
        Row: {
          empresa_id: string | null
          id: string
          outros_servicos: Json | null
          valor_honorario: number | null
          valor_por_funcionario: number | null
          valor_por_recalculo: number | null
          valor_trabalhista: number | null
        }
        Insert: {
          empresa_id?: string | null
          id?: string
          outros_servicos?: Json | null
          valor_honorario?: number | null
          valor_por_funcionario?: number | null
          valor_por_recalculo?: number | null
          valor_trabalhista?: number | null
        }
        Update: {
          empresa_id?: string | null
          id?: string
          outros_servicos?: Json | null
          valor_honorario?: number | null
          valor_por_funcionario?: number | null
          valor_por_recalculo?: number | null
          valor_trabalhista?: number | null
        }
        Relationships: []
      }
      honorarios_mensal: {
        Row: {
          competencia: string
          created_at: string | null
          data_envio: string | null
          data_vencimento: string | null
          detalhes_calculo: Json | null
          empresa_id: string
          forma_envio: string | null
          id: string
          observacoes: Json | null
          pago: boolean | null
          qtd_funcionarios: number | null
          qtd_recalculos: number | null
          status: Database["public"]["Enums"]["guia_status"] | null
          teve_encargo_trabalhista: boolean | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          competencia: string
          created_at?: string | null
          data_envio?: string | null
          data_vencimento?: string | null
          detalhes_calculo?: Json | null
          empresa_id: string
          forma_envio?: string | null
          id?: string
          observacoes?: Json | null
          pago?: boolean | null
          qtd_funcionarios?: number | null
          qtd_recalculos?: number | null
          status?: Database["public"]["Enums"]["guia_status"] | null
          teve_encargo_trabalhista?: boolean | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          competencia?: string
          created_at?: string | null
          data_envio?: string | null
          data_vencimento?: string | null
          detalhes_calculo?: Json | null
          empresa_id?: string
          forma_envio?: string | null
          id?: string
          observacoes?: Json | null
          pago?: boolean | null
          qtd_funcionarios?: number | null
          qtd_recalculos?: number | null
          status?: Database["public"]["Enums"]["guia_status"] | null
          teve_encargo_trabalhista?: boolean | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "honorarios_mensal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      licencas: {
        Row: {
          empresa_id: string | null
          file_url: string | null
          id: string
          numero_processo: string | null
          status: string | null
          tipo_licenca: string | null
          vencimento: string | null
        }
        Insert: {
          empresa_id?: string | null
          file_url?: string | null
          id?: string
          numero_processo?: string | null
          status?: string | null
          tipo_licenca?: string | null
          vencimento?: string | null
        }
        Update: {
          empresa_id?: string | null
          file_url?: string | null
          id?: string
          numero_processo?: string | null
          status?: string | null
          tipo_licenca?: string | null
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
      licencas_taxas: {
        Row: {
          competencia: string
          created_at: string | null
          data_envio: string | null
          data_vencimento: string | null
          empresa_id: string | null
          forma_envio: string | null
          id: string
          status: string
          tipo_licenca: string
        }
        Insert: {
          competencia: string
          created_at?: string | null
          data_envio?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          forma_envio?: string | null
          id?: string
          status?: string
          tipo_licenca: string
        }
        Update: {
          competencia?: string
          created_at?: string | null
          data_envio?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          forma_envio?: string | null
          id?: string
          status?: string
          tipo_licenca?: string
        }
        Relationships: [
          {
            foreignKeyName: "licencas_taxas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_read: boolean | null
          notification_id: string | null
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          notification_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          notification_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          label: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          is_enabled?: boolean | null
          label: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          label?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "notification_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          cidade: string | null
          created_at: string | null
          data_ocorrencia: string | null
          departamento: string
          descricao: string
          empresa_id: string | null
          estado: string | null
          id: string
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string | null
          data_ocorrencia?: string | null
          departamento: string
          descricao: string
          empresa_id?: string | null
          estado?: string | null
          id?: string
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string | null
          data_ocorrencia?: string | null
          departamento?: string
          descricao?: string
          empresa_id?: string | null
          estado?: string | null
          id?: string
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_empresa_id_fkey"
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
          competencia: string | null
          created_at: string | null
          dctf_web_gerada: boolean | null
          empresa_id: string | null
          fgts_data_envio: string | null
          fgts_status: Database["public"]["Enums"]["guia_status"] | null
          forma_envio: string | null
          id: string
          inss_data_envio: string | null
          inss_status: Database["public"]["Enums"]["guia_status"] | null
          possui_recibos: boolean | null
          possui_va: boolean | null
          possui_vc: boolean | null
          possui_vt: boolean | null
          qtd_funcionarios: number | null
          qtd_pro_labore: number | null
          qtd_recibos: number | null
          va_data_envio: string | null
          va_status: string | null
          vc_data_envio: string | null
          vc_status: string | null
          vt_data_envio: string | null
          vt_status: string | null
        }
        Insert: {
          competencia?: string | null
          created_at?: string | null
          dctf_web_gerada?: boolean | null
          empresa_id?: string | null
          fgts_data_envio?: string | null
          fgts_status?: Database["public"]["Enums"]["guia_status"] | null
          forma_envio?: string | null
          id?: string
          inss_data_envio?: string | null
          inss_status?: Database["public"]["Enums"]["guia_status"] | null
          possui_recibos?: boolean | null
          possui_va?: boolean | null
          possui_vc?: boolean | null
          possui_vt?: boolean | null
          qtd_funcionarios?: number | null
          qtd_pro_labore?: number | null
          qtd_recibos?: number | null
          va_data_envio?: string | null
          va_status?: string | null
          vc_data_envio?: string | null
          vc_status?: string | null
          vt_data_envio?: string | null
          vt_status?: string | null
        }
        Update: {
          competencia?: string | null
          created_at?: string | null
          dctf_web_gerada?: boolean | null
          empresa_id?: string | null
          fgts_data_envio?: string | null
          fgts_status?: Database["public"]["Enums"]["guia_status"] | null
          forma_envio?: string | null
          id?: string
          inss_data_envio?: string | null
          inss_status?: Database["public"]["Enums"]["guia_status"] | null
          possui_recibos?: boolean | null
          possui_va?: boolean | null
          possui_vc?: boolean | null
          possui_vt?: boolean | null
          qtd_funcionarios?: number | null
          qtd_pro_labore?: number | null
          qtd_recibos?: number | null
          va_data_envio?: string | null
          va_status?: string | null
          vc_data_envio?: string | null
          vc_status?: string | null
          vt_data_envio?: string | null
          vt_status?: string | null
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
      processos_societarios: {
        Row: {
          arquivamento_junta_at: string | null
          assinatura_contrato_at: string | null
          created_at: string | null
          data_inicio: string | null
          detalhes_passos: Json | null
          em_exigencia: boolean | null
          empresa_id: string | null
          envio_contrato_at: string | null
          envio_dbe_at: string | null
          envio_fcn_at: string | null
          envio_taxa_at: string | null
          exigencia_motivo: string | null
          exigencia_respondida: boolean | null
          foi_arquivado: boolean | null
          foi_deferido: boolean | null
          id: string
          nome_empresa: string | null
          numero_processo: string | null
          status: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          arquivamento_junta_at?: string | null
          assinatura_contrato_at?: string | null
          created_at?: string | null
          data_inicio?: string | null
          detalhes_passos?: Json | null
          em_exigencia?: boolean | null
          empresa_id?: string | null
          envio_contrato_at?: string | null
          envio_dbe_at?: string | null
          envio_fcn_at?: string | null
          envio_taxa_at?: string | null
          exigencia_motivo?: string | null
          exigencia_respondida?: boolean | null
          foi_arquivado?: boolean | null
          foi_deferido?: boolean | null
          id?: string
          nome_empresa?: string | null
          numero_processo?: string | null
          status?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          arquivamento_junta_at?: string | null
          assinatura_contrato_at?: string | null
          created_at?: string | null
          data_inicio?: string | null
          detalhes_passos?: Json | null
          em_exigencia?: boolean | null
          empresa_id?: string | null
          envio_contrato_at?: string | null
          envio_dbe_at?: string | null
          envio_fcn_at?: string | null
          envio_taxa_at?: string | null
          exigencia_motivo?: string | null
          exigencia_respondida?: boolean | null
          foi_arquivado?: boolean | null
          foi_deferido?: boolean | null
          id?: string
          nome_empresa?: string | null
          numero_processo?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_societarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      procuracoes: {
        Row: {
          data_vencimento: string | null
          empresa_id: string | null
          id: string
          observacao: string | null
        }
        Insert: {
          data_vencimento?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
        }
        Update: {
          data_vencimento?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
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
          departamento: string | null
          email_alertas: string | null
          endereco: Json | null
          favoritos: string[] | null
          first_access_done: boolean | null
          foto_url: string | null
          full_name: string | null
          id: string
          nome_completo: string | null
          profile_completed: boolean | null
          telefone: string | null
          terms_accepted_at: string | null
          updated_at: string | null
          user_id: string
          verification_code: string | null
          verification_code_expires_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          departamento?: string | null
          email_alertas?: string | null
          endereco?: Json | null
          favoritos?: string[] | null
          first_access_done?: boolean | null
          foto_url?: string | null
          full_name?: string | null
          id?: string
          nome_completo?: string | null
          profile_completed?: boolean | null
          telefone?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id: string
          verification_code?: string | null
          verification_code_expires_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          departamento?: string | null
          email_alertas?: string | null
          endereco?: Json | null
          favoritos?: string[] | null
          first_access_done?: boolean | null
          foto_url?: string | null
          full_name?: string | null
          id?: string
          nome_completo?: string | null
          profile_completed?: boolean | null
          telefone?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string
          verification_code?: string | null
          verification_code_expires_at?: string | null
        }
        Relationships: []
      }
      recalculos: {
        Row: {
          competencia: string
          created_at: string | null
          data_envio: string | null
          data_recalculo: string | null
          empresa_id: string | null
          forma_envio: string | null
          guia: string
          id: string
          modulo_origem: string
          parcelamento_id: string | null
          status: Database["public"]["Enums"]["guia_status"] | null
          updated_at: string | null
        }
        Insert: {
          competencia: string
          created_at?: string | null
          data_envio?: string | null
          data_recalculo?: string | null
          empresa_id?: string | null
          forma_envio?: string | null
          guia: string
          id?: string
          modulo_origem: string
          parcelamento_id?: string | null
          status?: Database["public"]["Enums"]["guia_status"] | null
          updated_at?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string | null
          data_envio?: string | null
          data_recalculo?: string | null
          empresa_id?: string | null
          forma_envio?: string | null
          guia?: string
          id?: string
          modulo_origem?: string
          parcelamento_id?: string | null
          status?: Database["public"]["Enums"]["guia_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recalculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recalculos_parcelamento_id_fkey"
            columns: ["parcelamento_id"]
            isOneToOne: false
            referencedRelation: "parcelamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      socios: {
        Row: {
          administrador: boolean | null
          cpf: string | null
          created_at: string | null
          data_entrada: string | null
          data_saida: string | null
          email: string | null
          empresa_id: string
          id: string
          nome: string
          percentual_cotas: number | null
          telefone: string | null
        }
        Insert: {
          administrador?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          percentual_cotas?: number | null
          telefone?: string | null
        }
        Update: {
          administrador?: boolean | null
          cpf?: string | null
          created_at?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          percentual_cotas?: number | null
          telefone?: string | null
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
      funcionarios: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          cpf: string | null
          created_at: string | null
          data_admissao: string | null
          data_ultimo_aso: string | null
          empresa_id: string | null
          id: string
          nome: string
          vencimento_aso: string | null
          vencimento_ferias: string | null
        }
        Insert: {
          ativo?: boolean | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_ultimo_aso?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          vencimento_aso?: string | null
          vencimento_ferias?: string | null
        }
        Update: {
          ativo?: boolean | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          data_ultimo_aso?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          vencimento_aso?: string | null
          vencimento_ferias?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      controle_irpf: {
        Row: {
          id: string
          nome_completo: string
          ano_exercicio: number
          valor_a_pagar: number | null
          status_pago: boolean | null
          data_pagamento: string | null
          status_transmissao: string | null
          data_transmissao: string | null
          transmitido_por: string | null
          cpf: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          nome_completo: string
          ano_exercicio: number
          valor_a_pagar?: number | null
          status_pago?: boolean | null
          data_pagamento?: string | null
          status_transmissao?: string | null
          data_transmissao?: string | null
          transmitido_por?: string | null
          cpf?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          nome_completo?: string
          ano_exercicio?: number
          valor_a_pagar?: number | null
          status_pago?: boolean | null
          data_pagamento?: string | null
          status_transmissao?: string | null
          data_transmissao?: string | null
          transmitido_por?: string | null
          cpf?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      servicos_esporadicos: {
        Row: {
          id: string
          nome_cliente: string
          cpf_cnpj: string | null
          tipo_servico: string
          valor: number | null
          competencia: string
          pago: boolean | null
          irpf_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          nome_cliente: string
          cpf_cnpj?: string | null
          tipo_servico: string
          valor?: number | null
          competencia: string
          pago?: boolean | null
          irpf_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          nome_cliente?: string
          cpf_cnpj?: string | null
          tipo_servico?: string
          valor?: number | null
          competencia?: string
          pago?: boolean | null
          irpf_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_esporadicos_irpf_id_fkey"
            columns: ["irpf_id"]
            isOneToOne: false
            referencedRelation: "controle_irpf"
            referencedColumns: ["id"]
          }
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
      can_access_empresa: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      check_cpf_email_match: {
        Args: { p_cpf: string; p_email: string }
        Returns: boolean
      }
      force_postgrest_reload: { Args: never; Returns: undefined }
      get_user_email_by_cpf: { Args: { p_cpf: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "client"
      empresa_situacao: "ativa" | "paralisada" | "baixada" | "mei" | "entregue" | "inapta" | "suspensa" | "nula"
      guia_status: "pendente" | "gerada" | "enviada" | "isento"
      licenca_tipo:
        | "definitiva"
        | "dispensada"
        | "com_vencimento"
        | "em_processo"
      regime_tributario: "simples" | "lucro_presumido" | "lucro_real" | "mei" | "simei"
      status_assinatura: "pendente" | "assinado" | "rejeitado"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "user", "client"],
      empresa_situacao: ["ativa", "paralisada", "baixada", "entregue"],
      guia_status: ["pendente", "gerada", "enviada"],
      licenca_tipo: [
        "definitiva",
        "dispensada",
        "com_vencimento",
        "em_processo",
      ],
      regime_tributario: ["simples", "lucro_presumido", "lucro_real", "mei"],
      status_assinatura: ["pendente", "assinado", "rejeitado"],
    },
  },
} as const
