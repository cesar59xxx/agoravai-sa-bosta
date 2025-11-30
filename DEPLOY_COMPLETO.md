# Deploy Completo - WhatsApp CRM SaaS

## Status Atual

✅ **Railway Backend**: Funcionando perfeitamente  
❌ **Vercel Frontend**: Faltam variáveis de ambiente do Supabase

---

## PASSO 1: Adicionar Variáveis na Vercel (URGENTE)

O erro "Invalid API key" acontece porque a Vercel não tem as credenciais do Supabase.

### 1.1 Abrir Settings na Vercel

1. Acesse: https://vercel.com/seu-usuario/whatsap-web-ee
2. Clique em **Settings** (topo da página)
3. Clique em **Environment Variables** (menu lateral esquerdo)

### 1.2 Adicionar as 2 Variáveis

Adicione estas duas variáveis (copie os valores do arquivo `.env.local.example`):

| Nome da Variável | Valor |
|------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ldieqcofmincppqzownw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaWVxY29mbWluY3BwcXpvd253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNTU2ODIsImV4cCI6MjA3OTgzMTY4Mn0.7vKYx_5kzPJGZYqE3s9Kw0BqN4cG5pDzHjMrVsXwLKo` |

**Importante**: Marque todas as caixas: Production, Preview, Development

### 1.3 Forçar Redeploy

Depois de adicionar as variáveis:

1. Vá em **Deployments** (topo da página)
2. Clique nos 3 pontinhos do último deployment
3. Clique em **Redeploy**
4. Aguarde 2-3 minutos

---

## PASSO 2: Verificar URLs do Sistema

Após o redeploy da Vercel, você terá:

### Frontend Vercel (Usuários)
\`\`\`
https://whatsap-web-eeyyyyyyy.vercel.app
\`\`\`

**Rotas disponíveis:**
- `/` - Landing page (página de venda)
- `/login` - Login de usuários
- `/sign-up` - Cadastro de novos usuários
- `/dashboard` - Dashboard do CRM (após login)

### Backend Railway (API)
\`\`\`
https://whatsap-web-ee-production.up.railway.app
\`\`\`

**Endpoints disponíveis:**
- `/health` - Status da API
- `/api/health` - Health check detalhado
- `/api/auth/*` - Endpoints de autenticação
- `/api/contacts/*` - Gerenciamento de contatos
- `/api/messages/*` - Mensagens do WhatsApp
- `/api/campaigns/*` - Campanhas de marketing

---

## PASSO 3: Testar o Sistema Completo

### 3.1 Testar Backend Railway

Abra no navegador:
\`\`\`
https://whatsap-web-ee-production.up.railway.app/health
\`\`\`

Deve mostrar:
\`\`\`json
{
  "message": "WhatsApp CRM Backend API",
  "version": "1.0.0",
  "status": "running"
}
\`\`\`

✅ Se aparecer isso, o backend está funcionando!

### 3.2 Testar Frontend Vercel

1. Abra: `https://whatsap-web-eeyyyyyyy.vercel.app/sign-up`
2. Preencha o formulário de cadastro
3. Clique em "Criar conta grátis"

✅ Se não mostrar "Invalid API key", está funcionando!
✅ Você deve receber um email de confirmação do Supabase

### 3.3 Confirmar Email e Fazer Login

1. Abra o email de confirmação do Supabase
2. Clique no link de confirmação
3. Volte para: `https://whatsap-web-eeyyyyyyy.vercel.app/login`
4. Faça login com suas credenciais

✅ Você deve ser redirecionado para o dashboard!

---

## PASSO 4: Domínio Railway (Opcional)

O Railway já fornece um domínio automático:
\`\`\`
https://whatsap-web-ee-production.up.railway.app
\`\`\`

Você **NÃO precisa** fazer nada extra. Este domínio:
- Já está funcionando
- Tem HTTPS automático
- É público e acessível

**Quando usar o domínio Railway:**
- Você NÃO acessa direto no navegador (é só API)
- O frontend Vercel já está configurado para usar este domínio
- Webhooks do WhatsApp vão usar este domínio

---

## Troubleshooting

### ❌ Ainda mostra "Invalid API key"

**Causa**: Variáveis não foram adicionadas ou redeploy não foi feito

**Solução**:
1. Verifique as variáveis em Settings > Environment Variables
2. Force um novo redeploy
3. Aguarde completar (2-3 minutos)
4. Limpe o cache do navegador (Ctrl + Shift + R)

### ❌ Railway mostra "Application failed to respond"

**Causa**: Health check timeout ou porta incorreta

**Solução**:
1. Vá no Railway Dashboard
2. Clique no serviço "whatsap-web-ee"
3. Clique em "Deployments"
4. Clique em "Redeploy" no último deployment
5. Aguarde 2-3 minutos

### ❌ Erro ao fazer login

**Causa**: Email não foi confirmado

**Solução**:
1. Verifique sua caixa de entrada (e spam)
2. Clique no link de confirmação do Supabase
3. Tente fazer login novamente

---

## Resumo Final

Depois de seguir estes passos, você terá:

1. ✅ Backend Railway funcionando e acessível
2. ✅ Frontend Vercel funcionando com Supabase configurado
3. ✅ Sistema de autenticação completo
4. ✅ Cadastro e login funcionando
5. ✅ Dashboard CRM acessível

**URLs finais:**
- Landing page: `https://whatsap-web-eeyyyyyyy.vercel.app`
- API Backend: `https://whatsap-web-ee-production.up.railway.app`
- Dashboard: `https://whatsap-web-eeyyyyyyy.vercel.app/dashboard`

Tudo pronto para uso! 🚀
