import nodemailer from "nodemailer";

function configurado(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM,
  );
}

export async function enviarEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!configurado()) return false;

  const port = Number(process.env.SMTP_PORT) || 587;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (erro) {
    console.error("[email] Falha ao enviar e-mail:", erro);
    return false;
  }
}

// `nome` vem direto do formulário público (Story 8.1), sem sanitização —
// escapar antes de interpolar em HTML evita que um cliente injete markup
// (links, tags) no e-mail enviado em nome do salão. `servicoNome`/
// `profissionalNome` vêm de cadastros do dono, mas são escapados pelo mesmo
// motivo (defesa em profundidade, custo zero).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function base(titulo: string, mensagem: string): string {
  return `<div style="font-family: sans-serif; color: #222;">
    <h2 style="margin: 0 0 12px;">${titulo}</h2>
    <p>${mensagem}</p>
  </div>`;
}

export function emailConfirmacao({
  nome,
  servicoNome,
  profissionalNome,
  dataHoraLabel,
}: {
  nome: string;
  servicoNome: string;
  profissionalNome: string;
  dataHoraLabel: string;
}): { subject: string; html: string } {
  return {
    subject: "Agendamento confirmado — Seu Salão",
    html: base(
      "Agendamento confirmado",
      `Olá, ${escapeHtml(nome)}! Seu horário de <strong>${escapeHtml(servicoNome)}</strong> com <strong>${escapeHtml(profissionalNome)}</strong> foi confirmado para <strong>${escapeHtml(dataHoraLabel)}</strong>. Até lá!`,
    ),
  };
}

export function emailRetencao({ nome }: { nome: string }): { subject: string; html: string } {
  return {
    subject: "Sentimos sua falta — Seu Salão",
    html: base(
      "Sentimos sua falta!",
      `Olá, ${escapeHtml(nome)}! Faz um tempo que você não aparece por aqui e sentimos sua falta. Esperamos te ver em breve!`,
    ),
  };
}

export function emailLembrete({
  nome,
  servicoNome,
  profissionalNome,
  dataHoraLabel,
}: {
  nome: string;
  servicoNome: string;
  profissionalNome: string;
  dataHoraLabel: string;
}): { subject: string; html: string } {
  return {
    subject: "Lembrete do seu agendamento — Seu Salão",
    html: base(
      "Lembrete de agendamento",
      `Olá, ${escapeHtml(nome)}! Passando pra lembrar do seu horário de <strong>${escapeHtml(servicoNome)}</strong> com <strong>${escapeHtml(profissionalNome)}</strong>, em <strong>${escapeHtml(dataHoraLabel)}</strong>. Te esperamos!`,
    ),
  };
}

// `produtos` vem de nomes já cadastrados pelo dono (não é entrada de
// terceiros), mas são escapados do mesmo jeito — defesa em profundidade,
// custo zero, mesmo padrão das outras funções deste arquivo.
export function emailAlertasOperacionais({
  produtos,
  caixaNaoFechado,
}: {
  produtos: string[];
  caixaNaoFechado: boolean;
}): { subject: string; html: string } {
  const partes: string[] = [];

  if (produtos.length > 0) {
    const lista = produtos.map((p) => escapeHtml(p)).join(", ");
    partes.push(`Produtos com estoque baixo: <strong>${lista}</strong>.`);
  }

  if (caixaNaoFechado) {
    partes.push("O caixa de ontem ainda não foi fechado.");
  }

  return {
    subject: "Resumo diário — Seu Salão",
    html: base("Resumo diário", partes.join("<br /><br />")),
  };
}
