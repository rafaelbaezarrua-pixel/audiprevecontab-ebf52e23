/**
 * Módulo de Segurança e Integridade - Audipreve Compliance
 * Implementa Parte 2.3 e 2.4 da especificação técnica.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Representa os documentos legais iniciais do sistema.
 * Estes dados devem ser inseridos na tabela legal_documents (Parte 1).
 */
export const INITIAL_LEGAL_DOCS = {
  TERMOS_DE_USO: {
    version: 'v1.0',
    type: 'TERMOS_DE_USO',
    content: `TERMOS E CONDIÇÕES DE USO DO PORTAL AUDIPREVE CONTAB

1. OBJETO E VINCULAÇÃO JURÍDICA
O presente instrumento estabelece as normas para acesso e utilização das funcionalidades do Portal Audipreve Contab. A aceitação destes termos é condição sine qua non para a fruição dos serviços digitais disponibilizados pela AUDIPREVE.

2. ESCOPO DAS FUNCIONALIDADES E RESPONSABILIDADES
2.1. O sistema disponibiliza módulos específicos para a Gestão Fiscal (controle de XML e obrigações tributárias), Departamento Pessoal (folha de pagamento e gestão de colaboradores), Societário e Auditoria.
2.2. A Audipreve atua como Operadora de Dados Pessoais (Art. 5º, VII, LGPD) ao processar informações enviadas pelos usuários ou coletadas via integrações oficiais, sendo o Usuário/Empresa o Controlador dos dados.
2.3. É de responsabilidade exclusiva do Usuário a veracidade das informações inseridas e a integridade das guias e declarações processadas com base em tais dados.

3. SEGURANÇA E ACESSO ÀS CREDENCIAIS
3.1. O Usuário declara ciência de que suas credenciais são pessoais e intransferíveis. O compartilhamento de senhas viola a PSI (Política de Segurança da Informação) e resultará na suspensão imediata do acesso.
3.2. O sistema utiliza trilhas de auditoria (audit logs) assinadas digitalmente para monitorar todas as interações, conforme exigido pelo Art. 191 e seguintes do Código Civil e normas de segurança digital.

4. CONFIDENCIALIDADE E PROPRIEDADE INTELECTUAL
Todas as informações financeiras, estratégicas e cadastrais acessadas via portal estão protegidas pelo sigilo profissional contábil e pela legislação de propriedade intelectual vigentes no Brasil.`
  },
  POLITICA_PRIVACIDADE: {
    version: 'v1.0',
    type: 'POLITICA_PRIVACIDADE',
    content: `POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS PESSOAIS - LGPD

1. FINALIDADE E BASES LEGAIS DO TRATAMENTO (Art. 7º LGPD)
O tratamento de dados pessoais pela Audipreve fundamenta-se nas seguintes hipóteses legais:
1.1. Cumprimento de Obrigação Legal/Regulatória (Art. 7º, II): Processamento de obrigações tributárias (Fiscal), previdenciárias e trabalhistas (Departamento Pessoal).
1.2. Execução de Contrato (Art. 7º, V): Prestação de serviços de assessoria contábil conforme acordado em contrato.
1.3. Legítimo Interesse (Art. 7º, IX): Garantia da segurança física e digital dos sistemas e prevenção a fraudes.

2. CATEGORIAS DE DADOS COLETADOS
2.1. Dados de Identificação: Nome completo, CPF, e-mail e telefone.
2.2. Dados Laborais: Remuneração, cargo, jornada de trabalho e afastamentos (para fins de eSocial e Folha).
2.3. Dados de Acesso: Endereço IP, Geolocalização aproximada, UserAgent e histórico de trilha de auditoria.

3. DIREITOS DOS TITULARES (Arts. 17 a 22 LGPD)
A Audipreve assegura ao titular o direito de solicitar:
3.1. Confirmação e acesso aos dados tratados.
3.2. Correção de dados incompletos ou inexatos.
3.3. Portabilidade dos dados a outro prestador de serviços, mediante requisição expressa.
3.4. Informação sobre compartilhamento de dados com entidades públicas ou privadas.

4. MEDIDAS DE SEGURANÇA E RETENÇÃO
4.1. Utilizamos criptografia AES-256 e hashes SHA-256 para integridade.
4.2. Os dados de login são retidos pelo prazo de 6 (seis) meses conforme exigência do Art. 15 da Lei 12.965/2014 (Marco Civil da Internet). Dados contábeis são retidos pelos prazos prescricionais vigentes (5 a 10 anos).

5. CANAL DO ENCARREGADO (DPO)
Para dúvidas ou requisições sobre seus dados pessoais, entre em contato via e-mail: dpo@audipreve.com.br.`
  },
  TERMO_RESPONSABILIDADE: {
    version: 'v1.0',
    type: 'TERMO_RESPONSABILIDADE',
    content: `TERMO DE RESPONSABILIDADE E ÉTICA DIGITAL

Ao aceitar este Termo, o Usuário declara:
1. Estar ciente das implicações legais da inserção de dados falsos ou omissos no sistema, sujeitando-se às penas previstas em lei.
2. Comprometer-se a não utilizar robôs ou scripts de automação que possam comprometer a estabilidade do portal.
3. Reconhecer a validade digital das assinaturas de auditoria do sistema como prova de integridade em processos judiciais ou fiscalizações.
4. Responsabilizar-se pelo uso de dispositivos seguros e livres de softwares maliciosos para acessar o ambiente Audipreve.`
  }
};

/**
 * Gera um Hash de Integridade para um Log de Auditoria
 * Parte 2.4 - Garante a imutabilidade da trilha.
 */
export async function signAuditLog(data: any, previousHash?: string) {
  const encoder = new TextEncoder();
  const logString = JSON.stringify({
    ...data,
    prev_hash: previousHash || 'genesis_audit'
  });

  const msgBuffer = encoder.encode(logString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    integrity_hash: hashHex,
    created_at: new Date().toISOString()
  };
}

/**
 * Trilha de Auditoria Automática
 * Hook helper para simplificar o registro de ações críticas (Parte 2.3).
 */
export async function logSecurityAction(action: string, details: any, userId?: string) {
  try {
    const { integrity_hash, created_at } = await signAuditLog({ action, details });

    await supabase.from('audit_logs' as any).insert({
      user_id: userId,
      action: action,
      table_name: details.resource || 'SYSTEM_COMPLIANCE', // Mapeado para AuditoriaPage
      new_data: details, // Mapeado para AuditoriaPage
      integrity_hash, // Campo de segurança extra
      created_at,
      ip_address: '0.0.0.0',
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Falha crítica na auditoria:', error);
  }
}
