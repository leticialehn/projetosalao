import { prisma } from "@/lib/prisma";
import { exigirPapel, PAPEL_DONO } from "@/lib/sessao";
import { FORMAS_PAGAMENTO } from "@/lib/financeiro";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/format";
import TaxasForm from "./TaxasForm";

export const dynamic = "force-dynamic";

export default async function TaxasPage() {
  await exigirPapel(PAPEL_DONO);

  const registros = await prisma.taxaPagamento.findMany();
  const porForma = new Map(registros.map((r) => [r.formaPagamento, r]));

  const linhas = FORMAS_PAGAMENTO.map((forma) => {
    const r = porForma.get(forma);
    return {
      forma,
      label: FORMA_PAGAMENTO_LABEL[forma],
      percentual: r?.percentual ?? 0,
      valorFixo: r?.valorFixo ?? 0,
    };
  });

  return (
    <>
      <h1>Taxas da maquininha</h1>
      <p className="subtitle">
        Quanto a adquirente desconta por forma de pagamento. Usado no caixa para
        mostrar o valor líquido.
      </p>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Forma</th>
              <th>Percentual (%)</th>
              <th>Valor fixo por transação (R$)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <TaxasForm key={l.forma} {...l} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
