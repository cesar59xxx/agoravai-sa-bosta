# Como Fazer Deploy no Railway

## Passo 1: Preparar o Código

Certifique-se que você tem estas 6 variáveis de ambiente configuradas no Railway:

\`\`\`
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...
FRONTEND_URL=https://seu-site.vercel.app
PORT=5000
\`\`\`

## Passo 2: Fazer Deploy

1. Commit e push para o GitHub:
\`\`\`bash
git add .
git commit -m "fix: railway health check"
git push
\`\`\`

2. No painel do Railway, o deploy será automático

3. Aguarde até ver no log:
\`\`\`
✅ Supabase client configurado
🚀 Servidor rodando na porta 5000
📱 WhatsApp CRM SaaS iniciado
\`\`\`

## Passo 3: Testar

Acesse: `https://seu-app.railway.app/health`

Deve retornar:
\`\`\`json
{
  "status": "ok",
  "timestamp": "2025-11-30T...",
  "uptime": 123.45
}
\`\`\`

## Problemas Comuns

**Application failed to respond**
- Verifique se a variável PORT está definida como 5000
- Confirme que todas as variáveis do Supabase estão corretas

**Servidor inicia mas não responde**
- Verifique se FRONTEND_URL está correto
- Teste o endpoint /health diretamente

## Próximos Passos

Depois que o Railway estiver funcionando:
1. Acesse seu site Vercel
2. Teste o cadastro de usuário
3. Teste o login
4. Conecte o WhatsApp no painel
