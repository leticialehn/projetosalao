import { describe, it, expect } from "vitest";
import {
  reais,
  somarPagamentos,
  totaisPorForma,
  resumoCaixa,
  resumoCaixaComTaxas,
  taxaDePagamento,
  comissao,
  percentualComissao,
  comissaoPorProfissionalComServico,
  valorBaseComissao,
  type PagamentoInput,
  type RegraComissao,
} from "./financeiro";

describe("reais", () => {
  it("arredonda para centavos half-up", () => {
    expect(reais(26.664)).toBe(26.66);
    expect(reais(26.665)).toBe(26.67);
  });
  it("elimina lixo de ponto flutuante", () => {
    expect(reais(0.1 + 0.2)).toBe(0.3);
  });
});

describe("somarPagamentos", () => {
  it("caixa vazio soma 0", () => {
    expect(somarPagamentos([])).toBe(0);
  });
  it("soma com centavos sem erro de float", () => {
    const p: PagamentoInput[] = [
      { valor: 0.1, formaPagamento: "DINHEIRO" },
      { valor: 0.2, formaPagamento: "PIX" },
    ];
    expect(somarPagamentos(p)).toBe(0.3);
  });
});

describe("totaisPorForma", () => {
  it("caixa vazio: todas as formas em 0", () => {
    expect(totaisPorForma([])).toEqual({
      DINHEIRO: 0,
      PIX: 0,
      DEBITO: 0,
      CREDITO: 0,
    });
  });
  it("uma forma de pagamento", () => {
    expect(
      totaisPorForma([{ valor: 50, formaPagamento: "PIX" }]),
    ).toEqual({ DINHEIRO: 0, PIX: 50, DEBITO: 0, CREDITO: 0 });
  });
  it("quatro formas de pagamento", () => {
    expect(
      totaisPorForma([
        { valor: 10, formaPagamento: "DINHEIRO" },
        { valor: 20, formaPagamento: "PIX" },
        { valor: 30, formaPagamento: "DEBITO" },
        { valor: 40, formaPagamento: "CREDITO" },
      ]),
    ).toEqual({ DINHEIRO: 10, PIX: 20, DEBITO: 30, CREDITO: 40 });
  });
});

describe("resumoCaixa", () => {
  it("caixa vazio: totalGeral 0, ticketMedio 0", () => {
    const r = resumoCaixa([], 0);
    expect(r.totalGeral).toBe(0);
    expect(r.ticketMedio).toBe(0);
    expect(r.porForma).toEqual({ DINHEIRO: 0, PIX: 0, DEBITO: 0, CREDITO: 0 });
  });
  it("ticketMedio 0 quando qtdAtendimentos é 0 (sem NaN/Infinity)", () => {
    const r = resumoCaixa([{ valor: 100, formaPagamento: "PIX" }], 0);
    expect(Number.isFinite(r.ticketMedio)).toBe(true);
    expect(r.ticketMedio).toBe(0);
  });
  it("ticketMedio = total / qtd", () => {
    const r = resumoCaixa(
      [
        { valor: 80, formaPagamento: "PIX" },
        { valor: 40, formaPagamento: "DINHEIRO" },
      ],
      2,
    );
    expect(r.totalGeral).toBe(120);
    expect(r.ticketMedio).toBe(60);
  });
});

describe("taxaDePagamento", () => {
  it("taxa 0 → 0", () => {
    expect(taxaDePagamento(100, { percentual: 0, valorFixo: 0 })).toBe(0);
  });
  it("só percentual", () => {
    expect(taxaDePagamento(100, { percentual: 3.5, valorFixo: 0 })).toBe(3.5);
  });
  it("só valor fixo", () => {
    expect(taxaDePagamento(100, { percentual: 0, valorFixo: 0.1 })).toBe(0.1);
  });
  it("percentual + fixo", () => {
    expect(taxaDePagamento(100, { percentual: 3.5, valorFixo: 0.1 })).toBe(3.6);
  });
  it("fixo maior que o valor → taxa limitada ao valor", () => {
    expect(taxaDePagamento(5, { percentual: 0, valorFixo: 10 })).toBe(5);
  });
});

describe("resumoCaixaComTaxas", () => {
  const pags: PagamentoInput[] = [
    { valor: 100, formaPagamento: "DINHEIRO" },
    { valor: 200, formaPagamento: "PIX" },
    { valor: 100, formaPagamento: "DEBITO" },
    { valor: 100, formaPagamento: "CREDITO" },
  ];
  const taxas = {
    DEBITO: { percentual: 1.5, valorFixo: 0 },
    CREDITO: { percentual: 3.5, valorFixo: 0.1 },
  };

  it("separa bruto/taxa/líquido por forma", () => {
    const r = resumoCaixaComTaxas(pags, 4, taxas);
    expect(r.porForma.DINHEIRO).toEqual({ bruto: 100, taxa: 0, liquido: 100 });
    expect(r.porForma.PIX).toEqual({ bruto: 200, taxa: 0, liquido: 200 });
    expect(r.porForma.DEBITO).toEqual({ bruto: 100, taxa: 1.5, liquido: 98.5 });
    expect(r.porForma.CREDITO).toEqual({ bruto: 100, taxa: 3.6, liquido: 96.4 });
  });

  it("totais fecham", () => {
    const r = resumoCaixaComTaxas(pags, 4, taxas);
    expect(r.totalBruto).toBe(500);
    expect(r.totalTaxas).toBe(5.1);
    expect(r.totalLiquido).toBe(494.9);
  });

  it("totalBruto == resumoCaixa(...).totalGeral (sem regressão)", () => {
    const r = resumoCaixaComTaxas(pags, 4, taxas);
    expect(r.totalBruto).toBe(resumoCaixa(pags, 4).totalGeral);
  });

  it("ticketMedio sobre o bruto", () => {
    const r = resumoCaixaComTaxas(pags, 4, taxas);
    expect(r.ticketMedio).toBe(125);
  });

  it("forma sem taxa cadastrada → taxa 0", () => {
    const r = resumoCaixaComTaxas(
      [{ valor: 100, formaPagamento: "CREDITO" }],
      1,
      {},
    );
    expect(r.porForma.CREDITO.taxa).toBe(0);
    expect(r.totalLiquido).toBe(100);
  });

  it("caixa vazio → tudo 0, ticketMedio 0", () => {
    const r = resumoCaixaComTaxas([], 0, taxas);
    expect(r.totalBruto).toBe(0);
    expect(r.totalTaxas).toBe(0);
    expect(r.totalLiquido).toBe(0);
    expect(r.ticketMedio).toBe(0);
  });
});

describe("valorBaseComissao", () => {
  const taxas = {
    DEBITO: { percentual: 1.5, valorFixo: 0 },
    CREDITO: { percentual: 3.5, valorFixo: 0.1 },
  };

  it("BRUTO ignora taxas e pagamentos", () => {
    const v = valorBaseComissao(
      {
        valorCobrado: 100,
        pagamentos: [{ valor: 100, formaPagamento: "CREDITO" }],
      },
      "BRUTO",
      taxas,
    );
    expect(v).toBe(100);
  });

  it("LIQUIDO com 1 pagamento: subtrai a taxa da forma", () => {
    const v = valorBaseComissao(
      {
        valorCobrado: 100,
        pagamentos: [{ valor: 100, formaPagamento: "CREDITO" }],
      },
      "LIQUIDO",
      taxas,
    );
    expect(v).toBe(96.4); // 100 - (3.5 + 0.1)
  });

  it("LIQUIDO com pagamento dividido em 2 formas: soma os líquidos", () => {
    const v = valorBaseComissao(
      {
        valorCobrado: 100,
        pagamentos: [
          { valor: 50, formaPagamento: "DINHEIRO" },
          { valor: 50, formaPagamento: "DEBITO" },
        ],
      },
      "LIQUIDO",
      taxas,
    );
    expect(v).toBe(99.25); // 50 + (50 - 0.75)
  });

  it("LIQUIDO sem pagamentos → cai no bruto", () => {
    const v = valorBaseComissao({ valorCobrado: 100 }, "LIQUIDO", taxas);
    expect(v).toBe(100);
  });

  it("LIQUIDO com forma sem taxa cadastrada → líquido = bruto pra aquela linha", () => {
    const v = valorBaseComissao(
      {
        valorCobrado: 100,
        pagamentos: [{ valor: 100, formaPagamento: "PIX" }],
      },
      "LIQUIDO",
      {},
    );
    expect(v).toBe(100);
  });
});

describe("comissao", () => {
  it("percentual 0 → 0", () => {
    expect(comissao(80, 0)).toBe(0);
  });
  it("valorCobrado 0 → 0", () => {
    expect(comissao(0, 50)).toBe(0);
  });
  it("comissao(80, 50) → 40", () => {
    expect(comissao(80, 50)).toBe(40);
  });
  it("comissao(80, 33.33) → 26.66 (half-up)", () => {
    expect(comissao(80, 33.33)).toBe(26.66);
  });
});

describe("percentualComissao", () => {
  const geral: RegraComissao = { servicoId: null, percentual: 40 };
  const corte: RegraComissao = { servicoId: "corte", percentual: 60 };

  it("só regra geral → usa a geral pra qualquer serviço", () => {
    expect(percentualComissao([geral], "corte")).toBe(40);
    expect(percentualComissao([geral], "escova")).toBe(40);
  });

  it("regra do serviço prevalece sobre a geral", () => {
    expect(percentualComissao([geral, corte], "corte")).toBe(60);
    // outro serviço sem regra específica ainda cai na geral
    expect(percentualComissao([geral, corte], "escova")).toBe(40);
  });

  it("nem geral nem específica → 0", () => {
    expect(percentualComissao([], "corte")).toBe(0);
  });

  it("só regra específica (sem geral) → serviço sem regra fica em 0", () => {
    expect(percentualComissao([corte], "corte")).toBe(60);
    expect(percentualComissao([corte], "escova")).toBe(0);
  });
});

describe("comissaoPorProfissionalComServico", () => {
  // Regressão Epic 1 (equivalente aos casos antigos de `comissaoPorProfissional`,
  // agora com `servicoId` e regra geral — sem regra por serviço, o resultado
  // por profissional é idêntico ao do Epic 1).
  it("agrega 2 profissionais com percentuais diferentes (sem regra por serviço)", () => {
    const r = comissaoPorProfissionalComServico(
      [
        { valorCobrado: 80, profissionalId: "a", servicoId: "corte" },
        { valorCobrado: 20, profissionalId: "a", servicoId: "corte" },
        { valorCobrado: 200, profissionalId: "b", servicoId: "corte" },
      ],
      {
        a: [{ servicoId: null, percentual: 40 }],
        b: [{ servicoId: null, percentual: 35 }],
      },
    );
    expect(r.a.qtd).toBe(2);
    expect(r.a.totalCobrado).toBe(100);
    expect(r.a.comissao).toBe(40);
    expect(r.b.qtd).toBe(1);
    expect(r.b.totalCobrado).toBe(200);
    expect(r.b.comissao).toBe(70);
  });

  it("não inventa profissionais sem atendimento", () => {
    const r = comissaoPorProfissionalComServico(
      [{ valorCobrado: 80, profissionalId: "a", servicoId: "corte" }],
      {
        a: [{ servicoId: null, percentual: 40 }],
        b: [{ servicoId: null, percentual: 35 }],
      },
    );
    expect(r.b).toBeUndefined();
  });

  it("sem nenhuma regra (nem geral, nem por serviço) → comissão 0", () => {
    const r = comissaoPorProfissionalComServico(
      [{ valorCobrado: 100, profissionalId: "a", servicoId: "corte" }],
      {},
    );
    expect(r.a.comissao).toBe(0);
  });

  it("sem atendimentos no período → objeto vazio", () => {
    const r = comissaoPorProfissionalComServico([], {
      ana: [{ servicoId: null, percentual: 40 }],
    });
    expect(r).toEqual({});
  });

  // Comportamento novo desta story: regra específica de serviço prevalece.
  it("mistura de atendimentos com e sem regra específica — total bate com a soma manual", () => {
    const regras: Record<string, RegraComissao[]> = {
      ana: [
        { servicoId: null, percentual: 40 }, // geral
        { servicoId: "corte", percentual: 60 }, // específica
      ],
    };
    const r = comissaoPorProfissionalComServico(
      [
        // serviço com regra específica: 100 * 60% = 60
        { valorCobrado: 100, profissionalId: "ana", servicoId: "corte" },
        // outro serviço, sem regra específica: usa a geral, 100 * 40% = 40
        { valorCobrado: 100, profissionalId: "ana", servicoId: "escova" },
      ],
      regras,
    );
    expect(r.ana.qtd).toBe(2);
    expect(r.ana.totalCobrado).toBe(200);
    expect(r.ana.comissao).toBe(100); // 60 + 40 — total é a soma por atendimento, não uma média

    expect(r.ana.porServico.corte).toEqual({
      qtd: 1,
      totalCobrado: 100,
      comissao: 60,
    });
    expect(r.ana.porServico.escova).toEqual({
      qtd: 1,
      totalCobrado: 100,
      comissao: 40,
    });
  });

  it("regra específica de outro serviço não interfere no serviço sem regra", () => {
    const regras: Record<string, RegraComissao[]> = {
      ana: [
        { servicoId: null, percentual: 40 },
        { servicoId: "coloracao", percentual: 60 },
      ],
    };
    const r = comissaoPorProfissionalComServico(
      [{ valorCobrado: 100, profissionalId: "ana", servicoId: "corte" }],
      regras,
    );
    expect(r.ana.comissao).toBe(40); // geral, não a de "coloracao"
  });

  it("cortesia (valorCobrado 0) conta como atendimento sem aumentar a comissão", () => {
    const r = comissaoPorProfissionalComServico(
      [
        { valorCobrado: 100, profissionalId: "ana", servicoId: "corte" },
        { valorCobrado: 0, profissionalId: "ana", servicoId: "corte" },
      ],
      { ana: [{ servicoId: null, percentual: 40 }] },
    );
    expect(r.ana).toEqual({
      qtd: 2,
      totalCobrado: 100,
      comissao: 40,
      porServico: { corte: { qtd: 2, totalCobrado: 100, comissao: 40 } },
    });
  });

  it("soma das comissões forma o total geral do período", () => {
    const r = comissaoPorProfissionalComServico(
      [
        { valorCobrado: 80, profissionalId: "ana", servicoId: "corte" },
        { valorCobrado: 200, profissionalId: "bruno", servicoId: "corte" },
        { valorCobrado: 0, profissionalId: "carla", servicoId: "corte" },
      ],
      {
        ana: [{ servicoId: null, percentual: 40 }],
        bruno: [{ servicoId: null, percentual: 35 }],
        carla: [{ servicoId: null, percentual: 30 }],
      },
    );
    const total = Object.values(r).reduce((acc, x) => acc + x.comissao, 0);
    expect(total).toBe(102); // 32 + 70 + 0
  });

  // Story 2.5: base BRUTO/LIQUIDO.
  it("base omitida (default) → idêntico a passar 'BRUTO' explicitamente (regressão 2.4)", () => {
    const atendimentos = [
      { valorCobrado: 80, profissionalId: "a", servicoId: "corte" },
      { valorCobrado: 200, profissionalId: "b", servicoId: "corte" },
    ];
    const regras = {
      a: [{ servicoId: null, percentual: 40 }],
      b: [{ servicoId: null, percentual: 35 }],
    };
    const semBase = comissaoPorProfissionalComServico(atendimentos, regras);
    const comBrutoExplicito = comissaoPorProfissionalComServico(
      atendimentos,
      regras,
      "BRUTO",
    );
    expect(semBase).toEqual(comBrutoExplicito);
  });

  it("base LIQUIDO: comissão sobre o líquido, mas totalCobrado continua o bruto", () => {
    const taxas = { CREDITO: { percentual: 3.5, valorFixo: 0.1 } };
    const r = comissaoPorProfissionalComServico(
      [
        {
          valorCobrado: 100,
          profissionalId: "ana",
          servicoId: "corte",
          pagamentos: [{ valor: 100, formaPagamento: "CREDITO" }],
        },
      ],
      { ana: [{ servicoId: null, percentual: 40 }] },
      "LIQUIDO",
      taxas,
    );
    expect(r.ana.totalCobrado).toBe(100); // bruto, independente da base da comissão
    expect(r.ana.comissao).toBe(38.56); // 96.4 * 40%
  });

  it("base LIQUIDO com pagamento dividido em 2 formas", () => {
    const taxas = { DEBITO: { percentual: 1.5, valorFixo: 0 } };
    const r = comissaoPorProfissionalComServico(
      [
        {
          valorCobrado: 100,
          profissionalId: "ana",
          servicoId: "corte",
          pagamentos: [
            { valor: 50, formaPagamento: "DINHEIRO" },
            { valor: 50, formaPagamento: "DEBITO" },
          ],
        },
      ],
      { ana: [{ servicoId: null, percentual: 40 }] },
      "LIQUIDO",
      taxas,
    );
    expect(r.ana.comissao).toBe(39.7); // (50 + 49.25) * 40% = 39.7
  });
});
