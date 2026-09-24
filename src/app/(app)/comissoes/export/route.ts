import { exigirPapel, PAPEL_DONO } from "@/lib/sessao";
import { inicioDoDia, intervaloMes, parseDataParam } from "@/lib/datas";
import { buscarRelatorioComissoes } from "../relatorio";

// Separador `;`: evita ambiguidade com o `.` usado como separador decimal
// (formato bruto, não `brl()`, pra ser importável em planilha sem
// re-parsing) e é o separador padrão do Excel em locale pt-BR.
const SEPARADOR = ";";

function campo(valor: string | number): string {
  const s = String(valor);
  if (s.includes(SEPARADOR) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  await exigirPapel(PAPEL_DONO);

  const url = new URL(request.url);
  const deParam = url.searchParams.get("de");
  const ateParam = url.searchParams.get("ate");

  // Param ausente ou inválido cai para o mês corrente — mesmo fallback de page.tsx.
  const mes = intervaloMes(new Date());
  const de = inicioDoDia(parseDataParam(deParam) ?? mes.de);
  const ate = inicioDoDia(parseDataParam(ateParam) ?? mes.ate);

  const { linhas } = await buscarRelatorioComissoes(de, ate);

  const cabecalho = [
    "Profissional",
    "Atendimentos",
    "Total Cobrado",
    "Percentual",
    "Comissão",
  ];
  const linhasCsv = [cabecalho.map(campo).join(SEPARADOR)];

  for (const l of linhas) {
    linhasCsv.push(
      [
        campo(l.nome),
        campo(l.qtd),
        campo(l.totalCobrado.toFixed(2)),
        campo(l.percentual),
        campo(l.comissao.toFixed(2)),
      ].join(SEPARADOR),
    );
    for (const s of l.porServico) {
      linhasCsv.push(
        [
          campo(`— ${s.nome}`),
          campo(s.qtd),
          campo(s.totalCobrado.toFixed(2)),
          campo(""),
          campo(s.comissao.toFixed(2)),
        ].join(SEPARADOR),
      );
    }
  }

  const csv = linhasCsv.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="comissoes.csv"',
    },
  });
}
