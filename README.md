# Certificados ABIX

Sistema interno para emitir certificados de treinamentos (A4 paisagem, frente e verso).

- **Modelos**: logo, cores, fontes, moldura e artes de fundo (frente e verso).
- **Cursos**: nome, data de conclusão, carga horária, ementa com formatação (negrito, listas, títulos, alinhamento), instrutor (nome, especialização, registro), terceira assinatura opcional (diretor/aprovador).
- **Alunos**: importação por CSV (nome + CPF), cadastro manual, edição.
- **Pré-visualização ao vivo** da frente e do verso enquanto edita. A ementa se ajusta sozinha (diminui a fonte e passa para 2 colunas se for longa).
- **Exportação**: todos em um único PDF, PDFs individuais em .zip, PDF por aluno, ou impressão (“Salvar como PDF” com texto vetorial).
- **Login**: administrador pré-definido (e-mail e senha) + contas Microsoft 365 autorizadas.

Stack: Next.js 15, Auth.js (NextAuth v5), Neon Postgres, TipTap, html-to-image + jsPDF.

---

## 1. Deploy na Vercel

1. Na Vercel, **Add New → Project** e importe este repositório do GitHub. Framework: Next.js (detectado automaticamente).
2. Antes ou depois do primeiro deploy, abra o projeto → **Storage → Create Database → Neon (Postgres)** e conecte ao projeto. Isso cria a variável `DATABASE_URL` automaticamente.
3. Em **Settings → Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `AUTH_SECRET` | um texto aleatório longo (ex.: rode `openssl rand -base64 32` ou use https://generate-secret.vercel.app/32) |
| `ADMIN_EMAIL` | e-mail do administrador, ex.: `admin@abix.com.br` |
| `ADMIN_PASSWORD` | senha forte do administrador |
| `ADMIN_NAME` | (opcional) nome exibido |

4. Faça **Redeploy**. As tabelas do banco são criadas sozinhas no primeiro acesso.
5. Entre em `https://SEU-DOMINIO/login` com o e-mail e a senha do administrador.

## 2. Login com Microsoft 365 (Entra ID)

1. Acesse https://entra.microsoft.com → **Identity → Applications → App registrations → New registration**.
   - Nome: `Certificados ABIX`
   - Supported account types: **Accounts in this organizational directory only** (single tenant)
   - Redirect URI: plataforma **Web**, URL `https://SEU-DOMINIO/api/auth/callback/microsoft-entra-id`
     (adicione também `http://localhost:3000/api/auth/callback/microsoft-entra-id` se for rodar localmente)
2. Na página do app, copie **Application (client) ID** e **Directory (tenant) ID**.
3. Em **Certificates & secrets → New client secret**, crie um segredo e copie o **Value** (não o Secret ID).
4. Na Vercel, adicione:

| Variável | Valor |
|---|---|
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Application (client) ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Value do client secret |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | Directory (tenant) ID |
| `ALLOW_ALL_TENANT_USERS` | `false` (padrão) — só entram os e-mails autorizados em **Usuários**. Use `true` para liberar qualquer conta do tenant como coordenador. |

5. Redeploy. O botão **Entrar com Microsoft 365** aparece na tela de login.
6. Entre como administrador e, em **Usuários**, autorize os e-mails dos coordenadores.

> O segredo do Entra ID expira (6–24 meses). Anote a data e gere um novo antes de vencer.

## 3. Uso

1. **Modelos → Novo modelo**: envie o logo da ABIX (PNG transparente), ajuste cores e fontes. Opcional: artes de fundo A4 (3508 × 2480 px).
2. **Cursos → Novo curso**: nome, modelo, data e carga horária.
3. Na tela do curso:
   - **Ementa**: escreva ou cole o conteúdo. Acompanhe o verso na pré-visualização.
   - **Assinaturas**: instrutor e, se precisar, a terceira assinatura. Assinaturas digitalizadas são opcionais.
   - **Alunos**: importe o CSV (use “Baixar modelo de CSV”) ou adicione manualmente.
4. **Emitir certificados**: “Baixar todos em um PDF”, “PDFs individuais (.zip)” ou “PDF” na linha de cada aluno.
   “Imprimir” abre a versão de impressão — escolha *Salvar como PDF* para um arquivo com texto vetorial (mais leve).

**CSV**: duas colunas, `nome` e `cpf`, separadas por `;` ou `,`. Arquivos salvos pelo Excel (Windows-1252) são lidos corretamente, e zeros à esquerda do CPF perdidos pelo Excel são recompostos.

**Duplicar**: cria um novo curso com a mesma ementa e assinaturas (sem alunos) — útil para turmas recorrentes.

## 4. Rodar localmente

```bash
cp .env.example .env.local   # preencha DATABASE_URL, AUTH_SECRET, ADMIN_*
npm install
npm run dev
```

## Observações

- O texto institucional “A ABIX TECNOLOGIA LTDA certifica que,” está em `components/Certificate.tsx` (`ISSUER_TEXT`).
- Imagens (logos, fundos, assinaturas) ficam no próprio banco, já reduzidas no navegador antes do envio.
- Os PDFs são gerados no navegador do usuário, sem custo de servidor. Cada página sai em imagem de alta resolução (cerca de 190 dpi); para arquivos menores e texto selecionável use “Imprimir → Salvar como PDF”.
- `next.config.mjs` ignora erros de tipagem no build como garantia extra; pode remover após o primeiro build.
