# Deploy — Railway

O app roda em Next.js 15 + SQLite (Prisma). O Railway mantém o SQLite num
**volume persistente**, faz deploy direto do repositório GitHub e roda as
migrações automaticamente a cada release.

## Configuração já feita no repo

- `railway.json` — builder Nixpacks; no start roda `prisma migrate deploy` e
  depois `next start`.
- `prisma/seed.ts` — protegido: só apaga dados com `--force`. **Produção começa
  vazia** — nada de seed automático.
- Migrações versionadas em `prisma/migrations/`.

## Passo a passo (painel do Railway — sem instalar nada)

1. Acesse https://railway.com e entre com a conta do GitHub.
2. **New Project → Deploy from GitHub repo → `leticialehn/projetosalao`**.
3. O primeiro build vai **falhar** (falta o banco) — normal. Configure:

### 3a. Volume (banco persistente)
- No serviço, aba **Settings → Volumes → New Volume**.
- Mount path: `/data`

### 3b. Variáveis de ambiente
Aba **Variables**, adicione:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | `file:/data/prod.db` |
| `SESSION_SECRET` | uma frase aleatória longa (≥ 32 caracteres) — ex.: gere em https://generate-secret.vercel.app/32 |
| `SESSION_TTL_HOURS` | `12` (opcional) |
| `ADMIN_USER` | o login do dono, ex.: `dono` |
| `ADMIN_PASSWORD` | a senha do dono (≥ 8 caracteres) — **use uma senha forte** |

> **Não** defina `NODE_ENV` — o `next start` já roda em modo produção sozinho, e forçar
> `NODE_ENV=production` no build faria o Railway pular dependências necessárias.

4. **Deploy** (Railway redeploya sozinho ao salvar as variáveis). No start o app:
   roda as migrações (`prisma migrate deploy`), **cria o usuário do dono** a partir de
   `ADMIN_USER`/`ADMIN_PASSWORD` se ainda não existir, e sobe o servidor.
5. Aba **Settings → Networking → Generate Domain** para pegar a URL pública
   (`https://projetosalao-production.up.railway.app`).

## Primeiro acesso

Abra a URL → tela de **login**. Entre com o `ADMIN_USER` / `ADMIN_PASSWORD` que você
configurou. Para trocar a senha depois: altere `ADMIN_PASSWORD` nas Variables do Railway
e rode `npm run db:seed:admin` (sem `--ensure`) pelo terminal do serviço, ou apague o
usuário e deixe o próximo deploy recriá-lo.

O banco de produção nasce **vazio**. No app (já logado):
1. Cadastre os **serviços** (`/servicos`)
2. Cadastre os **profissionais** e defina a **% de comissão** de cada um (`/profissionais`)
3. Cadastre os **clientes** (`/clientes`)
4. Comece a usar a agenda (`/`)

## Redeploys

Todo `git push` na branch `main` dispara um novo deploy. As migrações novas
(`prisma/migrations/`) são aplicadas automaticamente pelo `prisma migrate deploy`
no start — sem perder dados.

## Custo

Railway cobra por uso (~US$ 5/mês no plano Hobby para um app pequeno + volume).
