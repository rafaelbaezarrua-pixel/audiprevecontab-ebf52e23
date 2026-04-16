import { supabase } from '@/integrations/supabase/client';
import { INITIAL_LEGAL_DOCS } from './compliance';

/**
 * Função para popular o banco de dados com os termos legais iniciais.
 * Executa apenas se os documentos ainda não existirem.
 */
export async function seedLegalDocuments() {
  console.log('ComplianceSeed: Verificando documentos legais no banco...');
  
  for (const doc of Object.values(INITIAL_LEGAL_DOCS)) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('legal_documents' as any)
        .select('id')
        .eq('type', doc.type)
        .eq('version', doc.version)
        .maybeSingle();

      if (checkError) {
        console.error(`ComplianceSeed: Erro ao verificar existência de ${doc.type}:`, checkError.message);
        continue;
      }

      if (!existing) {
        console.log(`ComplianceSeed: Tentando inserir ${doc.type} ${doc.version}...`);
        
        const { error: insertError } = await supabase
          .from('legal_documents' as any)
          .insert({
            type: doc.type,
            version: doc.version,
            content: doc.content,
            hash_sha256: 'initial_hash_v1',
            is_active: true
          });

        if (insertError) {
          console.error(`ComplianceSeed: Falha ao inserir ${doc.type}:`, insertError.message);
        } else {
          console.log(`ComplianceSeed: ${doc.type} inserido com sucesso!`);
        }
      } else {
        console.log(`ComplianceSeed: Documento ${doc.type} v${doc.version} já existe.`);
      }
    } catch (err) {
      console.error('ComplianceSeed: Erro inesperado durante o seed:', err);
    }
  }
}
