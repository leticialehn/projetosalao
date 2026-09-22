import { prisma } from "@/lib/prisma";
import { horariosDisponiveis } from "@/lib/agenda";
import { parseDataParam, toDateParam, formatarDataHora } from "@/lib/datas";
import AgendarConfirmar from "./AgendarConfirmar";

export const dynamic = "force-dynamic";

const QUALQUER = "qualquer";

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    servicoId?: string;
    profissionalId?: string;
    data?: string;
    horario?: string;
    pid?: string;
  }>;
}) {
  const { servicoId, profissionalId, data: dataParam, horario, pid } =
    await searchParams;

  const servicos = await prisma.servico.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div style={{ minHeight: "100vh", padding: 20 }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="brand" style={{ padding: "0 0 16px" }}>
          Seu Salão
        </div>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>Agendar horário</h1>

        {!servicoId ? (
          <PassoServico servicos={servicos} />
        ) : horario && pid ? (
          <PassoConfirmar servicoId={servicoId} profissionalId={pid} inicio={horario} />
        ) : (
          <PassoProfissionalEData
            servicoId={servicoId}
            profissionalIdParam={profissionalId}
            dataParam={dataParam}
          />
        )}
      </div>
    </div>
  );
}

async function PassoServico({
  servicos,
}: {
  servicos: { id: string; nome: string; duracaoMin: number }[];
}) {
  return (
    <div className="card">
      <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Escolha o serviço</h2>
      <form method="get">
        <div className="field">
          <label htmlFor="servicoId">Serviço</label>
          <select id="servicoId" name="servicoId" required defaultValue="">
            <option value="" disabled>
              Selecione…
            </option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} ({s.duracaoMin} min)
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Continuar</button>
      </form>
    </div>
  );
}

async function PassoProfissionalEData({
  servicoId,
  profissionalIdParam,
  dataParam,
}: {
  servicoId: string;
  profissionalIdParam?: string;
  dataParam?: string;
}) {
  const servico = await prisma.servico.findUnique({ where: { id: servicoId } });
  if (!servico) {
    return (
      <div className="card">
        <div className="empty">Serviço não encontrado. Recomece o agendamento.</div>
      </div>
    );
  }

  const profissionaisTodos = await prisma.profissional.findMany({
    where: { ativo: true },
    include: { servicos: { select: { id: true } } },
    orderBy: { nome: "asc" },
  });
  // Lista vazia em `servicos` = sem restrição configurada (retrocompatibilidade
  // — Story 5.1, AC 2).
  const elegiveis = profissionaisTodos.filter(
    (p) => p.servicos.length === 0 || p.servicos.some((s) => s.id === servicoId),
  );

  const data = parseDataParam(dataParam) ?? new Date();

  let horarios: { hora: string; inicio: Date; profissionalId: string }[] = [];
  if (dataParam) {
    const profissionalIds =
      profissionalIdParam && profissionalIdParam !== QUALQUER
        ? [profissionalIdParam]
        : elegiveis.map((p) => p.id);
    horarios = await horariosDisponiveis(prisma, {
      data,
      duracaoMin: servico.duracaoMin,
      profissionalIds,
    });
  }

  const nomeProfissional = new Map(elegiveis.map((p) => [p.id, p.nome]));

  return (
    <>
      <div className="card">
        <form method="get">
          <input type="hidden" name="servicoId" value={servicoId} />
          <div className="field">
            <label htmlFor="profissionalId">Profissional</label>
            <select
              id="profissionalId"
              name="profissionalId"
              defaultValue={profissionalIdParam ?? QUALQUER}
            >
              <option value={QUALQUER}>Qualquer disponível</option>
              {elegiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="data">Data</label>
            <input
              id="data"
              name="data"
              type="date"
              required
              defaultValue={toDateParam(data)}
            />
          </div>
          <button type="submit">Ver horários</button>
        </form>
      </div>

      {dataParam && (
        <div className="card">
          <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Horários livres</h2>
          {horarios.length === 0 ? (
            <div className="empty">
              Nenhum horário livre nesse dia. Escolha outra data.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {horarios.map((h) => (
                <a
                  key={`${h.hora}-${h.profissionalId}`}
                  href={`/agendar?servicoId=${servicoId}&profissionalId=${
                    profissionalIdParam ?? QUALQUER
                  }&data=${toDateParam(data)}&horario=${h.inicio.toISOString()}&pid=${h.profissionalId}`}
                  className="badge"
                  style={{ textDecoration: "none" }}
                  title={nomeProfissional.get(h.profissionalId) ?? ""}
                >
                  {h.hora}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

async function PassoConfirmar({
  servicoId,
  profissionalId,
  inicio,
}: {
  servicoId: string;
  profissionalId: string;
  inicio: string;
}) {
  const [servico, profissional] = await Promise.all([
    prisma.servico.findUnique({ where: { id: servicoId } }),
    prisma.profissional.findUnique({ where: { id: profissionalId } }),
  ]);

  if (!servico || !profissional) {
    return (
      <div className="card">
        <div className="empty">Horário inválido. Recomece o agendamento.</div>
      </div>
    );
  }

  const dataHoraLabel = formatarDataHora(new Date(inicio));

  return (
    <AgendarConfirmar
      servicoNome={servico.nome}
      profissionalNome={profissional.nome}
      dataHoraLabel={dataHoraLabel}
      servicoId={servicoId}
      profissionalId={profissionalId}
      inicio={inicio}
    />
  );
}
