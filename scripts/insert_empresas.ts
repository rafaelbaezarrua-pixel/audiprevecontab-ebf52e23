/*
* To insert these companies bypassing RLS, run this SQL script in the Supabase SQL Editor:
*/

import fs from 'fs';

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

const sql = `
INSERT INTO empresas (nome_empresa, situacao, modulos_ativos) VALUES 
${companies.map(name => `('${name}', 'paralisada', '{"fiscal", "pessoal", "licencas", "certificados", "certidoes", "procuracoes", "vencimentos", "parcelamentos", "recalculos", "honorarios", "declaracoes_anuais", "societario"}')`).join(",\n")};
`;

fs.writeFileSync('insert_paralizadas.sql', sql);
console.log("SQL script generated at insert_paralizadas.sql - please run this in the Supabase SQL Editor to bypass RLS.");
