import { prisma } from "@/lib/prisma";
import { hora, STATUS_LABEL, brl } from "@/lib/format";
import {
  parseDataParam,
  inicioDoDia,
  inicioDoDiaSeguinte,
  inicioDaSemana,
  inicioDaSemanaSeguinte,
  toDateParam,
} from "@/lib/datas";
import { exigirSessao, PAPEL_PROFISSIONAL } from "@/lib/sessao";
import AgendaControles from "./AgendaControles";
import AgendaAcoes from "./AgendaAcoes";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ABERTURA = 8;
const FECHAMENTO = 20;
const PASSO_MIN = 30;

type SP = { data?: string; modo?: string; prof?: string };

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sessao = await exigirSessao();
  const ehProfissional = sessao.papel === PAPEL_PROFISSIONAL;

  if (ehProfissional && !sessao.profissionalId) {
    return (
      <>
        <h1>Agenda</h1>
        <div className="empty">
          Sua conta não está vinculada a nenhum profissional. Fale com o dono.
        </div>
      </>
    );
  }

  const sp = await searchParams;
  const ref = parseDataParam(sp.data) ?? inicioDoDia(new Date());
  const modo = sp.modo === "semana" ? "semana" : "dia";
  const prof = ehProfissional
    ? sessao.profissionalId!
    : sp.prof && sp.prof !== "todos"
      ? sp.prof
      : "todos";

  const de = modo === "semana" ? inicioDaSemana(ref) : inicioDoDia(ref);
  const ate =
    modo === "semana" ? inicioDaSemanaSeguinte(ref) : inicioDoDiaSeguinte(ref);

  const [profissionais, agendamentos] = await Promise.all([
    prisma.profissional.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.agendamento.findMany({
      where: {
        inicio: { gte: de, lt: ate },
        ...(prof !== "todos" ? { profissionalId: prof } : {}),
      },
      include: { cliente: true, servico: true, profissional: true },
      orderBy: { inicio: "asc" },
    }),
  ]);

  const profsVisiveis =
    prof !== "todos"
      ? profissionais.filter((p) => p.id === prof)
      : profissionais;

  return (
    <>
      <h1>Agenda</h1>
      <p className="subtitle">Horários do salão</p>

      <AgendaControles
        data={toDateParam(ref)}
        modo={modo}
        prof={prof}
        profissionais={profissionais.map((p) => ({ id: p.id, nome: p.nome }))}
        mostrarFiltroProfissional={!ehProfissional}
      />

      {modo === "dia" ? (
        <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(profsVisiveis.length || 1, 3)}, 1fr)` }}>
          {profsVisiveis.map((p, indice) => (
            <ColunaDia
              key={p.id}
              dia={ref}
              profId={p.id}
              profNome={p.nome}
              indice={indice}
              agendamentos={agendamentos.filter(
                (a) => a.profissionalId === p.id,
              )}
              profissionais={profissionais.map((x) => ({
                id: x.id,
                nome: x.nome,
              }))}
              somenteLeitura={ehProfissional}
            />
          ))}
        </div>
      ) : (
        <div className="agenda-grade">
          {semana(ref).map((d) => (
            <div className="agenda-dia" key={d.toISOString()}>
              <h3>
                {d.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                })}
              </h3>
              {agendamentos
                .filter(
                  (a) =>
                    a.inicio >= inicioDoDia(d) && a.inicio < inicioDoDiaSeguinte(d),
                )
                .map((a) => (
                  <div className={`slot`} key={a.id}>
                    <span className="slot-info">
                      <strong>
                        {hora(a.inicio)} {a.cliente.nome}
                      </strong>
                      <span className="muted">
                        {a.servico.nome} ·{" "}
                        <span className="prof-nome">{a.profissional.nome}</span>
                      </span>
                    </span>
                    <span className={`badge ${a.status}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </div>
                ))}
              {agendamentos.filter(
                (a) =>
                  a.inicio >= inicioDoDia(d) && a.inicio < inicioDoDiaSeguinte(d),
              ).length === 0 && <div className="muted">Sem agendamentos.</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function semana(ref: Date): Date[] {
  const start = inicioDaSemana(ref);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

type AgItem = {
  id: string;
  inicio: Date;
  fim: Date;
  status: string;
  profissionalId: string;
  cliente: { nome: string };
  servico: { nome: string; preco: number };
};

const PALETA_COLUNAS = ["var(--col-1)", "var(--col-2)", "var(--col-3)"];

function ColunaDia({
  dia,
  profId,
  profNome,
  indice,
  agendamentos,
  profissionais,
  somenteLeitura = false,
}: {
  dia: Date;
  profId: string;
  profNome: string;
  indice: number;
  agendamentos: AgItem[];
  profissionais: { id: string; nome: string }[];
  somenteLeitura?: boolean;
}) {
  const base = inicioDoDia(dia);
  const slots: Date[] = [];
  for (let m = ABERTURA * 60; m < FECHAMENTO * 60; m += PASSO_MIN) {
    const d = new Date(base);
    d.setMinutes(m);
    slots.push(d);
  }
  const cor = PALETA_COLUNAS[indice % PALETA_COLUNAS.length];

  return (
    <div className="agenda-dia">
      <div className="col-header" style={{ background: cor }}>
        <span className="avatar on-color">{profNome[0]?.toUpperCase()}</span>
        <h3 className="prof-nome-header">{profNome}</h3>
      </div>
      {slots.map((s) => {
        const fimSlot = new Date(s.getTime() + PASSO_MIN * 60000);
        const ocupa = agendamentos.find(
          (a) => a.inicio < fimSlot && a.fim > s,
        );
        if (ocupa && ocupa.inicio >= s) {
          return (
            <div className={`slot`} key={s.toISOString()}>
              <span className="slot-info">
                <strong>
                  {hora(ocupa.inicio)} {ocupa.cliente.nome}
                </strong>
                <span className="muted">
                  {ocupa.servico.nome} · {brl(ocupa.servico.preco)}
                </span>
                <span className={`badge ${ocupa.status}`}>
                  {STATUS_LABEL[ocupa.status]}
                </span>
                {!somenteLeitura && (
                  <AgendaAcoes
                    id={ocupa.id}
                    status={ocupa.status}
                    inicio={ocupa.inicio.toISOString()}
                    profissionalId={ocupa.profissionalId}
                    servicoNome={ocupa.servico.nome}
                    servicoPreco={ocupa.servico.preco}
                    clienteNome={ocupa.cliente.nome}
                    profissionais={profissionais}
                  />
                )}
              </span>
            </div>
          );
        }
        if (ocupa) return null; // continuação de um agendamento anterior
        if (somenteLeitura) {
          return (
            <div className="slot livre" key={s.toISOString()}>
              <span>{hora(s)}</span>
              <span>livre</span>
            </div>
          );
        }
        return (
          <Link
            key={s.toISOString()}
            className="slot livre"
            href={`/agendamentos?inicio=${encodeURIComponent(
              localInput(s),
            )}&profissionalId=${profId}`}
          >
            <span>{hora(s)}</span>
            <span>livre +</span>
          </Link>
        );
      })}
    </div>
  );
}

function localInput(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
