import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const companies = [
    "A PREDIAL BOMBAS LTDA",
    "ALEXANDRE PEREIRA DOS SANTOS",
    "BUDK INCORPORADORA LTDA",
    "C.M. FERREIRA CONSTRUCAO CIVIL LTDA",
    "CW TECH LTDA",
    "DELTA INTERMEDIACAO DE NEGOCIOS IMOBILIARIOS LTDA",
    "G. J. SANTOS & SANTOS LTDA",
    "IGREJA EVANGELICA ASSEMBLEIA DE DEUS MINISTERIO NOVA ALIANCA",
    "INCORPORADORA SAO JOSE LTDA",
    "J.B DE LIMA - FRANGO AMERICANO LTDA",
    "JONATHAN RIBEIRO FERREIRA DA SILVA",
    "LAERCIO CANHA - OBRAS",
    "MAKROUTIL MAQUINAS E UTILIDADES LTDA",
    "MARCO NADIR FLORES BERNARDO - SERVICOS",
    "MONTEC MANUTENCAO E MONTAGEM INDUSTRIAL LTDA",
    "PANIFICADORA ZANINI LTDA",
    "PROTECTION MED OCUPACIONAL LTDA",
    "REIS E SILVA CONSTRUTORA LTDA",
    "RING COMERCIO DE ALIMENTOS LTDA",
    "S. REIS CONSTRUTORA",
    "T & M CONSTRUTORA E INCORPORADORA LTDA",
    "WESLEY HERICKS DE ANDRADE - REPRESENTACOES",
    "Z. S. NOGUEIRA CONSTRUCAO"
];

async function insertCompanies() {
    console.log(`Inserting ${companies.length} companies...`);

    const insertData = companies.map(name => ({
        razao_social: name,
        nome_fantasia: name,
        status: 'Paralisada', // Assuming this is the correct spelling in your DB enum
        societario_active: true,
        fiscal_active: true,
        pessoal_active: true,
        certificados_active: true,
        certidoes_active: true,
        licencas_active: true,
        procuracoes_active: true,
        vencimentos_active: true,
        parcelamentos_active: true,
        recalculos_active: true,
        honorarios_active: true,
        agendamentos_active: true,
        declaracoes_anuais_active: true
    }));

    const { data, error } = await supabase
        .from('empresas')
        .insert(insertData)
        .select();

    if (error) {
        console.error("Error inserting companies:", error);
    } else {
        console.log(`Successfully inserted ${data.length} companies.`);
    }
}

insertCompanies();
