# RELATORIO DE AUDITORIA DE SEGURANCA - Audipreve Contabilidade
**Data:** 13/04/2026  
**Metodologia:** OWASP Top 10 + SAST (Static Application Security Testing)  
**Ambiente:** Teste controlado e autorizado pelo proprietario  

---

## RESUMO EXECUTIVO

| Severidade | Quantidade |
|------------|-----------|
| CRITICA    | 8         |
| ALTA       | 6         |
| MEDIA      | 5         |
| BAIXA      | 4         |
| **TOTAL**  | **23**    |

O sistema apresenta vulnerabilidades criticas que permitem: roubo de credenciais, bypass de autenticacao, escalacao de privilegio, e acesso nao autorizado a dados sensíveis. As vulnerabilidades mais graves sao a exposicao de credenciais no codigo-fonte e no bundle JavaScript, a desativacao da verificacao JWT em todas as Edge Functions, e a ausencia de autenticacao nas APIs serverless.

---

## VULNERABILIDADES CRITICAS

### VUL-C01: Credenciais Supabase expostas no repositorio Git
**OWASP:** A02 - Cryptographic Failures  
**Arquivo:** `.env` (commitado no Git)  
**Descricao:** O arquivo `.env` com URL e chave publicavel do Supabase esta commitado no historico do Git. Embora o `.gitignore` exclua `.env`, o arquivo ja estava rastreado antes da exclusao ser adicionada.  
```
VITE_SUPABASE_URL="https://jnqwvysjpbcpbwhlwgqq.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_BJf-1X4iJTcX0GSu4eHfBQ_HI9lUbuT"
```  
**Impacto:** Qualquer pessoa com acesso ao repositorio pode interagir diretamente com o Supabase.  
**Correcao:**
1. Rotacionar imediatamente a chave publicavel no painel do Supabase
2. Remover arquivos do historico Git: `git filter-branch --force --index-filter "git rm --cached .env .env.local"` ou usar BFG Repo-Cleaner
3. Nunca commitar arquivos `.env` com valores reais

---

### VUL-C02: Token OIDC do Vercel + Credenciais FileBrowser expostas
**OWASP:** A02 - Cryptographic Failures  
**Arquivo:** `.env.local` (commitado no Git)  
**Descricao:** O arquivo `.env.local` contem um JWT completo do Vercel OIDC (que concede acesso ao pipeline de deploy) e credenciais do FileBrowser em texto plano:  
```
VERCEL_OIDC_TOKEN="eyJhbGciOiJSUzI1NiIs..."  (JWT completo)
VITE_FILEBROWSER_URL=http://192.168.100.3:8081
VITE_FILEBROWSER_USER=admin
VITE_FILEBROWSER_PASS=SuaSenhaForte
```  
**Impacto:** 
- Token Vercel permite acessar e modificar deployments
- Senha `SuaSenhaForte` e o acesso admin ao servidor de arquivos interno
- IP interno `192.168.100.3` revela topologia de rede  
**Correcao:**
1. Revogar o token OIDC no Vercel imediatamente
2. Trocar a senha do FileBrowser
3. Remover `.env.local` do historico Git

---

### VUL-C03: Credenciais FileBrowser embutidas no bundle JavaScript
**OWASP:** A02 - Cryptographic Failures  
**Arquivo:** `src/lib/filebrowser.ts:7-10`  
**Descricao:** Variaveis `VITE_` sao embarcadas no bundle JavaScript de producao. Qualquer usuario pode extrair as credenciais do FileBrowser abrindo o DevTools do navegador:  
```typescript
const FB_BASE_URL = import.meta.env.VITE_FILEBROWSER_URL ?? "http://192.168.100.3:8081";
const FB_USER     = import.meta.env.VITE_FILEBROWSER_USER ?? "admin";
const FB_PASS     = import.meta.env.VITE_FILEBROWSER_PASS ?? "";
```  
**Impacto:** Qualquer usuario do sistema (autenticado ou nao) pode obter acesso admin ao FileBrowser.  
**Correcao:**
1. Criar um endpoint proxy no backend que autentica com o FileBrowser
2. Nunca usar prefixo `VITE_` para credenciais de backend
3. Remover fallbacks hardcoded de credenciais

---

### VUL-C04: JWT decode sem verificacao de assinatura nas Edge Functions
**OWASP:** A07 - Identification and Authentication Failures  
**Arquivos:** 
- `supabase/functions/create-user/index.ts:48-50`
- `supabase/functions/manage-user/index.ts:47-49`  
**Descricao:** As funcoes usam `decode()` do `djwt` que apenas faz base64-decode do payload sem verificar a assinatura. Um atacante pode forjar um JWT com `sub` de um admin:  
```typescript
const [_header, payload, _signature] = decode(token);
callerId = (payload as any).sub;  // Aceita qualquer sub sem verificar!
```  
Combinado com `verify_jwt = false` (VUL-C05), nao ha nenhuma autenticacao real.  
**Impacto:** Escalacao de privilegio completa - qualquer atacante pode se passar por admin e criar/gerenciar usuarios.  
**Correcao:**
1. Usar `verify()` do `djwt` com a chave JWT secreta do Supabase
2. Ou usar `supabaseAdmin.auth.getUser(token)` que verifica a assinatura

---

### VUL-C05: `verify_jwt = false` em TODAS as Edge Functions
**OWASP:** A07 - Identification and Authentication Failures  
**Arquivo:** `supabase/config.toml:3-21`  
**Descricao:** Todas as 4 Edge Functions tem verificacao JWT desabilitada:  
```toml
[functions.create-user]
verify_jwt = false
[functions.manage-user]
verify_jwt = false
[functions.send-verification-code]
verify_jwt = false
[functions.send-alert-email]
verify_jwt = false
```  
**Impacto:** Supabase nao valida o bearer token antes de invocar a funcao. Qualquer pessoa pode chamar esses endpoints diretamente.  
**Correcao:**
1. Ativar `verify_jwt = true` em todas as funcoes
2. Se necessario desabilitar (raro), implementar verificacao manual rigorosa com `verify()`

---

### VUL-C06: API de assinatura PDF sem autenticacao
**OWASP:** A01 - Broken Access Control  
**Arquivo:** `api/sign-pdf.ts`  
**Descricao:** O endpoint `/api/sign-pdf` nao requer autenticacao. Qualquer pessoa pode:
- Assinar PDFs com certificados digitais fornecidos
- Enviar chaves privadas PFX e senhas no corpo da requisicao  
**Impacto:** Assinatura fraudulenta de documentos, roubo de certificados digitais.  
**Correcao:**
1. Exigir token JWT valido no header Authorization
2. Validar que o usuario tem permissao para assinar documentos
3. Nunca aceitar certificados PFX via API - armazenar no backend

---

### VUL-C07: reCAPTCHA usando chave de teste (zero protecao)
**OWASP:** A07 - Identification and Authentication Failures  
**Arquivos:**
- `src/pages/LoginPage.tsx:163`
- `src/pages/ClientLoginPage.tsx:279`  
**Descricao:** A chave `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI` e a chave de TESTE publica do Google que SEMPRE passa na verificacao. Alem disso, nao ha verificacao server-side do token reCAPTCHA.  
**Impacto:** Bots podem fazer brute-force de senhas sem nenhuma protecao CAPTCHA.  
**Correcao:**
1. Gerar chave reCAPTCHA real no Google Admin Console
2. Implementar verificacao server-side do token (chamar API do Google)
3. Usar reCAPTCHA v3 (score-based) para melhor UX

---

### VUL-C08: Senha padrao hardcoded para novos usuarios
**OWASP:** A07 - Identification and Authentication Failures  
**Arquivo:** `supabase/functions/create-user/index.ts:85,99`  
**Descricao:** Usuarios criados sem senha recebem `Mudar@Audipreve123` como padrao:  
```typescript
password: password || "Mudar@Audipreve123",
```  
**Impacto:** Atacantes que conhecem essa senha podem tentar login em qualquer conta recem-criada.  
**Correcao:**
1. Gerar senhas aleatorias fortes para cada novo usuario
2. Forcar troca de senha no primeiro acesso
3. Remover senha padrao hardcoded

---

## VULNERABILIDADES DE ALTA SEVERIDADE

### VUL-H01: CORS wildcard em todas as Edge Functions
**OWASP:** A05 - Security Misconfiguration  
**Arquivos:** Todas as Edge Functions em `supabase/functions/`  
**Descricao:** Todas as funcoes usam `Access-Control-Allow-Origin: *` ou refletem a origin do requester:  
```typescript
"Access-Control-Allow-Origin": origin || "*"
```  
**Impacto:** Qualquer site malicioso pode fazer requisicoes cross-origin autenticadas se um token estiver disponivel.  
**Correcao:** Restringir CORS para o dominio de producao: `https://seudominio.com.br`

---

### VUL-H02: API de scraping sem autenticacao
**OWASP:** A01 - Broken Access Control  
**Arquivo:** `api/consultar-guia-alvara.ts`  
**Descricao:** O endpoint `/api/consultar-guia-alvara` nao requer autenticacao e usa `eval()` em atributos `onclick` extraidos do site Betha (linha 243):  
```typescript
const onClickOriginal = marcarTodas.getAttribute('onclick');
if (onClickOriginal) (window as any).eval(onClickOriginal);
```  
**Impacto:** Abuso de recursos, code injection via site comprometido, SSRF potencial.  
**Correcao:**
1. Exigir autenticacao no endpoint
2. Substituir `eval()` por seletor CSS + acao direta no Puppeteer
3. Validar URLs antes de seguir redirects

---

### VUL-H03: Token FileBrowser na URL (query parameter)
**OWASP:** A02 - Cryptographic Failures  
**Arquivo:** `src/lib/filebrowser.ts:172`  
**Descricao:** Token de autenticacao e exposto como query parameter:  
```typescript
return `${FB_BASE_URL}/api/raw${encodePath(path)}?auth=${token}`;
```  
**Impacto:** Token aparece em logs, historico do navegador, headers Referer.  
**Correcao:** Usar header Authorization para downloads, ou endpoint proxy no backend.

---

### VUL-H04: Service Role Key usada como mecanismo de autenticacao
**OWASP:** A01 - Broken Access Control  
**Arquivo:** `supabase/functions/send-alert-email/index.ts:40`  
**Descricao:** A funcao valida autenticacao comparando o header Authorization diretamente com a Service Role Key:  
```typescript
if (authHeader !== `Bearer ${serviceKey}`)
```  
**Impacto:** Se a Service Role Key for exposta (ela bypassa toda RLS), um atacante tera acesso total ao banco de dados.  
**Correcao:** Usar JWT de usuario com verificacao de assinatura. Nunca usar Service Role Key como token de API.

---

### VUL-H05: Rate limiting apenas no client-side
**OWASP:** A07 - Identification and Authentication Failures  
**Arquivos:** `src/pages/LoginPage.tsx`, `src/pages/ClientLoginPage.tsx`  
**Descricao:** Controle de tentativas de login usa `localStorage`, que pode ser bypassado com:
- Limpar localStorage
- Modo incognito
- Chamadas diretas a API do Supabase  
**Impacto:** Brute-force de senhas sem limitacao real.  
**Correcao:** Implementar rate limiting server-side (Supabase Rate Limiting, Vercel Edge Middleware, ou servico como Upstash Rate Limit).

---

### VUL-H06: String de conexao PostgreSQL exposta
**OWASP:** A02 - Cryptographic Failures  
**Arquivo:** `supabase/.temp/pooler-url`  
**Descricao:** Arquivo contem string de conexao parcial:  
```
postgresql://postgres.jnqwvysjpbcpbwhlwgqq@aws-0-us-west-2.pooler.supabase.com:5432/postgres
```  
**Impacto:** Facilita ataques de brute-force na senha do banco.  
**Correcao:** Adicionar `supabase/.temp/` ao `.gitignore` e limpar do historico.

---

## VULNERABILIDADES DE MEDIA SEVERIDADE

### VUL-M01: Path traversal no FileBrowser
**OWASP:** A01 - Broken Access Control  
**Arquivo:** `src/lib/filebrowser.ts:64-66`  
**Descricao:** A funcao `encodePath()` preserva barras (`/`) sem validar `..`:  
```typescript
function encodePath(path: string): string {
  return encodeURIComponent(path).replace(/%2F/g, "/");
}
```  
Se `pasta_servidor` em `empresas` contiver `../../etc`, pode acessar arquivos fora do diretorio pretendido.  
**Correcao:** Validar que o path nao contem `..` e normalizar com `path.resolve()`.

---

### VUL-M02: Stack traces retornados ao cliente
**OWASP:** A05 - Security Misconfiguration  
**Arquivos:**
- `supabase/functions/manage-user/index.ts:131`
- `supabase/functions/create-user/index.ts:253`
- `supabase/functions/send-verification-code/index.ts:155-158`  
**Descricao:** Erros retornam `err.stack` completo ao cliente.  
**Correcao:** Retornar apenas mensagens de erro genéricas. Logar stack traces apenas no servidor.

---

### VUL-M03: XSS via dangerouslySetInnerHTML no QR MFA
**OWASP:** A03 - Injection  
**Arquivo:** `src/pages/ClientLoginPage.tsx:302`  
**Descricao:** QR code MFA renderizado com `dangerouslySetInnerHTML={{ __html: mfaQrCode }}`.  
**Correcao:** Sanitizar SVG com DOMPurify antes de renderizar, ou converter para data-URL image.

---

### VUL-M04: Ausencia de protecao CSRF
**OWASP:** A01 - Broken Access Control  
**Descricao:** Nenhuma protecao CSRF em todo o sistema. Operacoes de estado (insert, update, delete) dependem apenas do JWT no header.  
**Correcao:** Implementar tokens anti-CSRF ou usar cookie SameSite=Strict para sessoes.

---

### VUL-M05: FileBrowser sobre HTTP (sem criptografia)
**OWASP:** A02 - Cryptographic Failures  
**Arquivo:** `src/lib/filebrowser.ts`  
**Descricao:** Toda comunicacao com o FileBrowser e via HTTP puro (`http://192.168.100.3:8081`). Tokens, conteudo de arquivos e operacoes sao transmitidos em claro.  
**Correcao:** Configurar HTTPS no FileBrowser com certificado TLS.

---

## VULNERABILIDADES DE BAIXA SEVERIDADE

### VUL-L01: TypeScript strict mode desabilitado
**Arquivo:** `tsconfig.json`  
**Descricao:** `strict: false`, `noImplicitAny: false`, `strictNullChecks: false` permitem erros de tipo silenciosos.  
**Correcao:** Ativar `strict: true` gradualmente.

### VUL-L02: IP interno hardcoded no bundle
**Arquivos:** `src/lib/filebrowser.ts:8`, `vite.config.ts:20`  
**Descricao:** IPs `192.168.100.3` e `192.168.1.100` sao embarcados no bundle de producao.  
**Correcao:** Usar variavel de ambiente sem fallback hardcoded.

### VUL-L03: IDOR em paginas de entidade
**Arquivos:** `src/pages/TarefaFormPage.tsx`, `src/pages/SocietarioEmpresaPage.tsx`, etc.  
**Descricao:** Parametros de URL (`id`, `empresaId`) sao usados diretamente em queries sem verificar autorizacao do usuario. RLS do Supabase mitiga isso no banco, mas nao e defense-in-depth.  
**Correcao:** Verificar autorizacao no frontend antes de exibir dados.

### VUL-L04: Mensagem de erro manipulavel no ResetPasswordPage
**Arquivo:** `src/pages/ResetPasswordPage.tsx:18`  
**Descricao:** Hash fragment da URL e decodificado e exibido sem validacao. Atacante pode criar link com `error_description` falso.  
**Correcao:** Validar origem do erro antes de exibir.

---

## PLANO DE CORRECAO PRIORITARIO

### FASE 1 - Acao Imediata (24-48h)
| # | Acao | VULs Impactadas |
|---|------|-----------------|
| 1 | Rotacionar TODAS as credenciais expostas: Supabase publishable key, Vercel OIDC token, senha FileBrowser, senha padrao | C01, C02, C03, C08 |
| 2 | Ativar `verify_jwt = true` em todas as Edge Functions | C05 |
| 3 | Substituir `decode()` por verificacao JWT real nas Edge Functions | C04 |
| 4 | Remover arquivos `.env` e `.env.local` do historico Git | C01, C02 |

### FASE 2 - Correcao Semanal (1-2 semanas)
| # | Acao | VULs Impactadas |
|---|------|-----------------|
| 1 | Mover credenciais FileBrowser para backend proxy | C03, H03, M05 |
| 2 | Adicionar autenticacao nas APIs `/api/sign-pdf` e `/api/consultar-guia-alvara` | C06, H02 |
| 3 | Configurar reCAPTCHA real com verificacao server-side | C07 |
| 4 | Restringir CORS para dominios especificos | H01 |
| 5 | Implementar rate limiting server-side | H05 |

### FASE 3 - Fortalecimento (2-4 semanas)
| # | Acao | VULs Impactadas |
|---|------|-----------------|
| 1 | Sanitizar QR code MFA com DOMPurify | M03 |
| 2 | Remover `eval()` do scraper e usar abordagem direta | H02 |
| 3 | Implementar protecao CSRF | M04 |
| 4 | Validar paths contra traversal | M01 |
| 5 | Configurar HTTPS no FileBrowser | M05 |
| 6 | Remover stack traces de respostas de erro | M02 |
| 7 | Ativar TypeScript strict mode | L01 |
| 8 | Configurar Content-Security-Policy header no Vercel | Diversas |

---

## CHECKLIST DE VERIFICACAO POS-CORRECAO

- [ ] Todas as credenciais foram rotacionadas
- [ ] Nenhum arquivo `.env` com valores reais no historico Git
- [ ] `verify_jwt = true` em todas as Edge Functions
- [ ] JWT verificado com assinatura em todas as funcoes
- [ ] Nenhuma credencial `VITE_` no bundle de producao
- [ ] Autenticacao em todos os endpoints de API
- [ ] reCAPTCHA real com verificacao server-side
- [ ] CORS restrito ao dominio de producao
- [ ] Rate limiting server-side em endpoints de autenticacao
- [ ] HTTPS em todas as comunicacoes
- [ ] CSP header configurado
- [ ] Stack traces removidos de respostas ao cliente