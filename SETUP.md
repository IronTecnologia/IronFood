# MesaFlow — Configuração

## 1. Criar projeto no Supabase
1. Acesse https://supabase.com e crie um novo projeto
2. Vá em Project Settings > API e copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

## 2. Configurar variáveis de ambiente
Crie o arquivo `.env` na raiz do projeto:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

## 3. Executar as migrações SQL
No Supabase Dashboard → SQL Editor, execute em ordem:
1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rls.sql`

## 4. Criar usuário admin
1. No Supabase Dashboard → Authentication → Users → Add User
2. Informe email e senha (ex: admin@empresa.com / Admin@123)
3. Copie o UUID gerado

## 5. Executar seed com dados demo
No SQL Editor, edite `supabase/migrations/003_seed.sql`:
- Substitua `<USER_UUID>` pelo UUID copiado no passo 4
- Execute o arquivo

## 6. Rodar em desenvolvimento
```bash
npm run dev
```
Acesse http://localhost:5173

## Perfis de acesso
| Perfil       | Acesso |
|-------------|--------|
| admin        | Tudo |
| waiter       | Mesas + Pedidos + KDS |
| kitchen      | KDS Cozinha |
| bar          | KDS Bar |
| cashier      | Caixa + Pedidos |

## Cardápio digital
Após configurar o tenant, acesse:
`http://localhost:5173/menu/{slug-do-tenant}`

O QR Code é gerado automaticamente em Configurações.

## Integrações futuras preparadas
- **Asaas**: cobrança online (adicionar webhook em `/api/asaas`)
- **WhatsApp**: notificações (adicionar em `src/lib/whatsapp.ts`)
- **Impressora térmica**: via Web Serial API ou serviço local
