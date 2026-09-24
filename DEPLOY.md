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
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | opcionais — confirmação/lembrete por e-mail (Story 8.2). Sem elas, o app funciona normalmente, só sem enviar e-mail |
| `LEMBRETES_CRON_SECRET` | opcional — segredo do endpoint `/api/lembretes` (ver 3c abaixo). Sem ele, a rota fica desativada (503) |
| `LEMBRETE_ANTECEDENCIA_MIN` | opcional — antecedência do lembrete em minutos (default `1440` = 24h) |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_TEMPLATE_NAME` / `WHATSAPP_TEMPLATE_LANG` | opcionais — lembrete também por WhatsApp (Story 8.3, ver 3d abaixo). Sem elas, o lembrete sai só por e-mail |

> **Não** defina `NODE_ENV` — o `next start` já roda em modo produção sozinho, e forçar
> `NODE_ENV=production` no build faria o Railway pular dependências necessárias.

4. **Deploy** (Railway redeploya sozinho ao salvar as variáveis). No start o app:
   roda as migrações (`prisma migrate deploy`), **cria o usuário do dono** a partir de
   `ADMIN_USER`/`ADMIN_PASSWORD` se ainda não existir, e sobe o servidor.
5. Aba **Settings → Networking → Generate Domain** para pegar a URL pública
   (`https://projetosalao-production.up.railway.app`).

### 3c. Cron Job de lembretes (opcional, Story 8.2)

Só necessário se você configurou `SMTP_*`/`LEMBRETES_CRON_SECRET` e quer lembretes
automáticos por e-mail antes do horário (confirmação já sai sozinha na hora do
agendamento, sem precisar de cron):

1. No painel do Railway, adicione um **Cron Job** (ou um serviço agendado, dependendo
   do plano) que faça uma chamada HTTP periódica (sugestão: a cada hora):
   ```
   GET https://<seu-domínio>/api/lembretes
   Authorization: Bearer <mesmo valor de LEMBRETES_CRON_SECRET>
   ```
2. Sem essa chamada configurada, os agendamentos continuam sendo criados e
   confirmados normalmente — só o lembrete de véspera não é enviado.

### 3d. WhatsApp (opcional, Story 8.3)

Adiciona o WhatsApp como canal extra do lembrete (o e-mail continua funcionando
normalmente sem isso):

1. Crie um app no [Meta Business Manager](https://business.facebook.com/) e ative
   a **WhatsApp Cloud API**.
2. Pegue o **access token** (permanente, não o temporário de teste) e o
   **phone number ID** do número configurado.
3. Crie um **template de mensagem** com exatamente **4 variáveis de corpo**, nesta
   ordem: nome do cliente, nome do serviço, nome do profissional, data/hora. Aguarde
   a aprovação da Meta antes de usar o nome do template em produção.
4. Configure `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e
   `WHATSAPP_TEMPLATE_NAME` (e `WHATSAPP_TEMPLATE_LANG`, se o template não for
   `pt_BR`) nas Variables do Railway.

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
