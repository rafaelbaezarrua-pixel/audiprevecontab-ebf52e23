# Relatório de Segurança - Sistema Audiprevecontab

## Resumo Executivo

Este documento descreve as melhorias de segurança implementadas no sistema para "blindar" a aplicação contra vulnerabilidades comuns e ataques.

---

## Melhorias Implementadas

### 1. Remoção de Scripts Inseguros

**Arquivos removidos:**
- `query_notifs.cjs`
- `query_notifs.mjs`
- `query_notifs2.mjs`

**Motivo:** Estes scripts faziam parsing manual de arquivos `.env`, o que é uma prática insegura. O parsing manual não valida corretamente o conteúdo e pode levar a comportamentos inesperados.

**Substituição:** Criado `scripts/admin-query.ts` usando a biblioteca `dotenv` oficialmente para carregamento seguro de variáveis de ambiente.

---

### 2. Headers de Segurança HTTP

**Arquivo:** `vercel.json`

**Headers adicionados:**

| Header | Valor | Propósito |
|--------|-------|-----------|
| `Content-Security-Policy` | `default-src 'self'; ...` | Previne XSS e injeção de conteúdo |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isola contexto de navegação |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Previne ataques de timing |
| `X-Frame-Options` | `DENY` | Previne clickjacking |
| `X-Content-Type-Options` | `nosniff` | Previne MIME sniffing |
| `Strict-Transport-Security` | `max-age=31536000` | Força HTTPS |

---

### 3. Configuração CORS Segura

**Arquivo:** `vite.config.ts`

**Melhorias:**
- CORS configurado para produção com origens específicas
- Headers de segurança no proxy de API
- `X-Forwarded-Proto: https` para comunicação segura

---

### 4. Validação e Sanitização de Dados

#### useNotifications.ts
- Sanitização de strings (prevenção de XSS)
- Validação de URLs (apenas domínios confiáveis)
- Validação de tipos de dados
- Limites de tamanho para campos

#### useTarefas.ts
- Sanitização de strings e histórico
- Rate limiting (mínimo 2s entre requisições)
- Validação de status
- Retry com backoff exponencial
- Proteção contra flood de requisições

---

### 5. Audit Log Seguro

**Arquivo:** `src/lib/audit.ts`

**Melhorias:**
- Rate limiting (60 logs/minuto)
- Sanitização de dados sensíveis (CPF, senhas, tokens)
- Validação de nome de tabela (previne SQL injection)
- Validação de tipos de ação
- Limites de profundidade e tamanho

---

### 6. Timeout de Sessão por Inatividade

**Arquivo:** `src/contexts/AuthContext.tsx`

**Configurações:**
- Timeout de inatividade: 30 minutos
- Aviso prévio: 5 minutos antes
- Check interval: 30 segundos
- Detecção de atividade do usuário (mouse, teclado, touch)

**Validações de login:**
- Validação de formato de e-mail (max 255 chars)
- Validação de senha (max 128 chars)
- Registro de atividade no login bem-sucedido

---

### 7. FileBrowser Seguro

**Arquivo:** `src/lib/filebrowser.ts`

**Proteções implementadas:**
- Validação de path (previne path traversal)
- Bloqueio de sequências `..` e `\`
- Sanitização de nomes de arquivo
- Rate limiting (500ms entre requisições)
- Limite de itens por requisição (100)
- Validação de URLs de download
- Proteção contra null byte poisoning

---

### 8. Arquivos Sensíveis Removidos

**Removido:**
- `.env.local.clean` ( continha credenciais reais)

**Protegido:**
- `.env.local` está no `.gitignore`

---

## Boas Práticas Recomendadas

### Para Desenvolvedores

1. **Nunca** commite arquivos `.env` ou `.env.local`
2. Use `scripts/admin-query.ts` para queries administrativas (não crie scripts ad-hoc)
3. Sempre valide e sanitize inputs do usuário
4. Use as funções do `AuthContext` para verificar permissões
5. O audit log remove automaticamente dados sensíveis

### Para Administradores

1. Mantenha o `.gitignore` atualizado
2. Revise periodicamente as políticas de RLS no Supabase
3. Monitore os logs de auditoria
4. Use HTTPS em produção para todas as comunicações
5. Considere usar túnel SSH para o FileBrowser (atualmente HTTP local)

---

## Verificação de Segurança

### Testes Manuais

1. **Headers de segurança:**
   ```bash
   curl -I https://seu-dominio.com
   ```
   Verifique se todos os headers estão presentes.

2. **CORS:**
   - Teste acesso de origens não autorizadas
   - Verifique console do browser para erros de CORS

3. **Timeout de sessão:**
   - Faça login e fique inativo por 30 minutos
   - Verifique se o logout é realizado automaticamente

4. **XSS:**
   - Tente inserir scripts em campos de formulário
   - Verifique se o conteúdo é escapado

### Testes Automatizados

```bash
# Verificar vulnerabilidades em dependências
npm audit

# Rodar testes existentes
npm test
```

---

## Monitoramento Contínuo

### Logs para Monitorar

1. `[AUDIT] Rate limit excedido` - Possível tentativa de flood
2. `[WARN] Path inválido` - Tentativa de path traversal
3. `[AUTH] Sessão expirada por inatividade` - Funcionamento correto do timeout
4. `[WARN] Notificação com campos inválidos` - Dados corrompidos ou ataque

### Métricas de Segurança

- Número de tentativas de login falhas
- Taxa de rate limiting acionado
- Sessões expiradas por inatividade
- Erros de validação de input

---

## Histórico de Mudanças

| Data | Mudança | Impacto |
|------|---------|---------|
| 2026-04-15 | Remoção de scripts inseguros | Alto |
| 2026-04-15 | Headers CSP e COOP/COEP | Alto |
| 2026-04-15 | Validação em useNotifications | Médio |
| 2026-04-15 | Rate limiting em useTarefas | Médio |
| 2026-04-15 | Audit log com sanitização | Alto |
| 2026-04-15 | Timeout de sessão | Alto |
| 2026-04-15 | FileBrowser seguro | Alto |

---

## Contato

Para reportar vulnerabilidades ou dúvidas sobre segurança, entre em contato com a equipe de desenvolvimento.
