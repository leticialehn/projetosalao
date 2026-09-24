import { prisma } from "@/lib/prisma";
import { enviarEmail, emailRetencao } from "@/lib/email";
import { enviarWhatsapp, normalizarTelefoneBR } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const secret = process.env.RETENCAO_CRON_SECRET;
  if (!secret) {
    return Response.json(
      { erro: "Retenção desativada: configure RETENCAO_CRON_SECRET." },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const diasInatividade = Number(process.env.RETENCAO_DIAS_INATIVIDADE) || 45;
  const cutoff = new Date(Date.now() - diasInatividade * 24 * 60 * 60000);

  const clientes = await prisma.cliente.findMany({
    include: {
      agendamentos: {
        where: { status: { in: ["CONCLUIDO", "AGENDADO"] } },
        orderBy: { inicio: "desc" },
      },
    },
  });

  const elegiveis = clientes.filter((cliente) => {
    const temFuturo = cliente.agendamentos.some((a) => a.status === "AGENDADO");
    const ultimaVisita = cliente.agendamentos.find((a) => a.status === "CONCLUIDO");

    return Boolean(
      !temFuturo &&
        ultimaVisita &&
        ultimaVisita.inicio < cutoff &&
        (!cliente.ultimoLembreteRetencaoEm ||
          cliente.ultimoLembreteRetencaoEm < ultimaVisita.inicio),
    );
  });

  let enviados = 0;
  let pulados = 0;

  for (const cliente of elegiveis) {
    const telefoneWhats = cliente.telefone ? normalizarTelefoneBR(cliente.telefone) : null;

    if (!cliente.email && !telefoneWhats) {
      pulados++;
      continue;
    }

    const emailOk = cliente.email
      ? await enviarEmail({
          to: cliente.email,
          ...emailRetencao({ nome: cliente.nome }),
        })
      : false;

    const whatsappOk = telefoneWhats
      ? await enviarWhatsapp({
          to: telefoneWhats,
          parametros: [cliente.nome],
          templateName: process.env.WHATSAPP_TEMPLATE_RETENCAO_NAME,
        })
      : false;

    if (emailOk || whatsappOk) {
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: { ultimoLembreteRetencaoEm: new Date() },
      });
      enviados++;
    }
  }

  return Response.json({ enviados, pulados, total: elegiveis.length });
}
