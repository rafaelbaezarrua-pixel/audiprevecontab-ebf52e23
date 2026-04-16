# Manual de Conformidade LGPD e Segurança - Audipreve

Este documento contém as Instruções de Trabalho (ITs) obrigatórias conforme a PSI e as exigências da LGPD.

---

## IT-001: Gestão de Identidades e Acessos (IAM)

### Cadastro
1. Apenas perfis **ADMIN** ou **SUPER_ADMIN** podem solicitar a criação de contas.
2. É obrigatório o uso de e-mail corporativo.
3. O sistema gera uma senha temporária (BCrypt) com validade de 24h.
4. No primeiro login, o redirecionamento para o Modal de Consentimento e troca de senha é mandatório.

### Desligamento
1. Em caso de rescisão, a conta deve ser suspensa imediatamente no Painel Admin.
2. Todas as sessões ativas devem ser invalidadas via "Forçar logout de todas as sessões".
3. Os logs de auditoria do usuário devem ser preservados por 5 anos (Marco Civil).

---

## IT-002: Resposta a Incidentes de Segurança

1. **Detecção**: Qualquer anomalia em logs de auditoria assinados (hash inválido) dispara alerta ao DPO.
2. **Contenção**: Bloqueio de IPs suspeitos e isolamento de banco de dados se necessário.
3. **Notificação (Art. 48 LGPD)**: 
   - A ANPD e os titulares devem ser notificados em caso de risco relevante em até 72h.
   - O relatório deve conter: descrição dos dados, riscos e medidas de mitigação.

---

## IT-003: Direitos do Titular (LGPD Art. 18)

O Titular pode solicitar via Canal de Contato:
1. **Acesso**: Exportação de seus dados em formato JSON/CSV em até 15 dias.
2. **Correção**: Alteração de dados incompletos ou inexatos.
3. **Eliminação**: Exclusão de dados tratados sob consentimento, ressalvadas as obrigações legais (contábil/fiscal).

---

## IT-004: Gestão de Documentos Legais

1. Versões são incrementais (v1.0, v1.1...).
2. Atualizações que alterem a finalidade do tratamento requerem **re-consentimento** obrigatório.
3. Termos antigos são arquivados com o hash original para comprovação histórica de aceite.

---

## IT-005: Revisão de Acessos (Trimestral)

1. A cada 90 dias, o Super Admin deve gerar relatório de usuários ativos x perfis.
2. Acessos não utilizados por mais de 45 dias devem ser suspensos automaticamente.
