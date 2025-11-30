# Guia Completo - Resolver "Invalid API key"

## O Que Fazer AGORA

### 1. Abra o Console do Navegador

1. Abra: https://whatsapp-novoooooooooo.vercel.app/sign-up
2. Pressione **F12** (ou Cmd+Option+I no Mac)
3. Vá na aba **Console**
4. Tente criar uma conta
5. Procure por mensagens que começam com **[v0]**
6. Me envie uma screenshot ou copie as mensagens

### 2. Verificar as Chaves do Supabase

É possível que você esteja usando a chave ERRADA. Existem 2 tipos:

**ANON KEY (pública)** - para o FRONTEND
- Começa com: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...`
- Tem cerca de 250-300 caracteres

**SERVICE ROLE KEY (secreta)** - para o BACKEND  
- Também começa com: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...`
- Tem cerca de 250-300 caracteres
- É DIFERENTE da ANON KEY

### 3. Pegar as Chaves Corretas

1. Vá para: https://supabase.com/dashboard
2. Abra seu projeto
3. Vá em **Settings** → **API**
4. Você verá:

\`\`\`
Project URL
https://ldieqcofmincppqzownw.supabase.co

Project API keys
┌─────────────────┬──────────────────────────────┐
│ anon public     │ eyJhbGci... (COPIE ESTA!)   │
│ service_role    │ eyJhbGci... (NÃO USE AQUI!) │
└─────────────────┴──────────────────────────────┘
\`\`\`

### 4. Configurar na Vercel

Na Vercel, você DEVE ter:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL = https://ldieqcofmincppqzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = (Cole a anon public do passo 3)
\`\`\`

IMPORTANTE: Não use a `service_role` no frontend! Ela é só para o backend Railway.

### 5. Forçar Redeploy

Após corrigir as variáveis:

1. Vá para: https://vercel.com/cesarmediotec-9518s-projects/whatsapp-novo
2. Clique em **Deployments**
3. No deploy mais recente, clique nos **3 pontinhos (...)** 
4. Selecione **Redeploy**
5. Aguarde 1-2 minutos

### 6. Testar Novamente

1. Abra o frontend
2. Vá em **/sign-up**
3. Preencha o formulário
4. Abra o console (F12) e veja os logs **[v0]**
5. Me envie os logs se ainda der erro

## URLs do Sistema

- Frontend: https://whatsapp-novoooooooooo.vercel.app
- Backend: https://whatsapp-novoooooooooo-production.up.railway.app
- Backend Health: https://whatsapp-novoooooooooo-production.up.railway.app/health

## Checklist

- [ ] Pegar a ANON KEY correta no Supabase (Settings → API)
- [ ] Configurar na Vercel como NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] Fazer redeploy na Vercel
- [ ] Abrir o console (F12) e ver os logs [v0]
- [ ] Tentar criar conta novamente
- [ ] Me enviar os logs do console se ainda der erro
