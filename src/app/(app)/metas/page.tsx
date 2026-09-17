import { prisma } from "@/lib/prisma";
import { exigirPapel, PAPEL_DONO } from "@/lib/sessao";
import { intervaloMes, toDateParam } from "@/lib/datas";
import Metas from "./Metas";

export const dynamic = "force-dynamic";

export default async function MetasPage() {
  await exigirPapel(PAPEL_DONO);

  const [profissionais, metas] = await Promise.all([
    prisma.profissional.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.meta.findMany({
      orderBy: { criadoEm: "desc" },
      include: { profissional: { select: { nome: true } } },
    }),
  ]);

  const mes = intervaloMes(new Date());

  return (
    <>
      <h1>Metas</h1>
      <p className="subtitle">Metas de faturamento e comissão por período</p>

      <Metas
        profissionais={profissionais}
        metas={metas.map((m) => ({
          id: m.id,
          tipo: m.tipo,
          profissionalNome: m.profissional?.nome ?? null,
          periodoInicio: toDateParam(m.periodoInicio),
          periodoFim: toDateParam(m.periodoFim),
          valorAlvo: m.valorAlvo,
        }))}
        periodoInicioDefault={toDateParam(mes.de)}
        periodoFimDefault={toDateParam(mes.ate)}
      />
    </>
  );
}
