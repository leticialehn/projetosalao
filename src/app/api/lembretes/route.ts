import { prisma } from "@/lib/prisma";
import { formatarDataHora } from "@/lib/datas";
import { enviarEmail, emailLembrete } from "@/lib/email";

export async function GET(request: Request) {
  const secret = process.env.LEMBRETES_CRON_SECRET;
  if (!secret) {
    return Response.json(
      { erro: "Lembretes desativados: configure LEMBRETES_CRON_SECRET." },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const antecedenciaMin = Number(process.env.LEMBRETE_ANTECEDENCIA_MIN) || 1440;
  const agora = new Date();
  const limite = new Date(agora.getTime() + antecedenciaMin * 60000);

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      status: "AGENDADO",
      lembreteEnviadoEm: null,
      inicio: { gt: agora, lte: limite },
    },
    include: { cliente: true, servico: true, profissional: true },
  });

  let enviados = 0;
  let pulados = 0;

  for (const ag of agendamentos) {
    if (!ag.cliente.email) {
      pulados++;
      continue;
    }

    const ok = await enviarEmail({
      to: ag.cliente.email,
      ...emailLembrete({
        nome: ag.cliente.nome,
        servicoNome: ag.servico.nome,
        profissionalNome: ag.profissional.nome,
        dataHoraLabel: formatarDataHora(ag.inicio),
      }),
    });

    if (ok) {
      await prisma.agendamento.update({
        where: { id: ag.id },
        data: { lembreteEnviadoEm: new Date() },
      });
      enviados++;
    }
  }

  return Response.json({ enviados, pulados, total: agendamentos.length });
}
