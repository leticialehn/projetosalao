import { describe, it, expect } from "vitest";
import {
  reais,
  somarPagamentos,
  totaisPorForma,
  resumoCaixa,
  resumoCaixaComTaxas,
  taxaDePagamento,
  comissao,
  comissaoPorProfissional,
  type PagamentoInput,
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

describe("comissaoPorProfissional", () => {
  it("agrega 2 profissionais com percentuais diferentes", () => {
    const r = comissaoPorProfissional(
      [
        { valorCobrado: 80, profissionalId: "a" },
        { valorCobrado: 20, profissionalId: "a" },
        { valorCobrado: 200, profissionalId: "b" },
      ],
      { a: 40, b: 35 },
    );
    expect(r.a).toEqual({ qtd: 2, totalCobrado: 100, comissao: 40 });
    expect(r.b).toEqual({ qtd: 1, totalCobrado: 200, comissao: 70 });
  });
  it("não inventa profissionais sem atendimento", () => {
    const r = comissaoPorProfissional(
      [{ valorCobrado: 80, profissionalId: "a" }],
      { a: 40, b: 35 },
    );
    expect(r.b).toBeUndefined();
  });
  it("atendimento com valorCobrado 0 conta na qtd, comissão 0", () => {
    const r = comissaoPorProfissional(
      [{ valorCobrado: 0, profissionalId: "a" }],
      { a: 40 },
    );
    expect(r.a).toEqual({ qtd: 1, totalCobrado: 0, comissao: 0 });
  });
  it("sem regra de percentual → comissão 0", () => {
    const r = comissaoPorProfissional(
      [{ valorCobrado: 100, profissionalId: "a" }],
      {},
    );
    expect(r.a.comissao).toBe(0);
  });

  // Cenário do relatório /comissoes (Story 1.8): 2 profissionais com
  // atendimentos e 1 sem, percentuais diferentes, uma cortesia no meio.
  it("2 profissionais com atendimentos + 1 sem, percentuais diferentes", () => {
    const percentuais = { ana: 40, bruno: 50, carla: 30 };
    const r = comissaoPorProfissional(
      [
        { valorCobrado: 80, profissionalId: "ana" },
        { valorCobrado: 120, profissionalId: "ana" },
        { valorCobrado: 60, profissionalId: "bruno" },
      ],
      percentuais,
    );
    expect(r.ana).toEqual({ qtd: 2, totalCobrado: 200, comissao: 80 });
    expect(r.bruno).toEqual({ qtd: 1, totalCobrado: 60, comissao: 30 });
    expect(r.carla).toBeUndefined();
    // A página monta a linha de Carla com zeros a partir da lista de
    // profissionais — a função pura não a inventa.
    expect(Object.keys(r).sort()).toEqual(["ana", "bruno"]);
  });

  it("cortesia (valorCobrado 0) conta como atendimento sem aumentar a comissão", () => {
    const r = comissaoPorProfissional(
      [
        { valorCobrado: 100, profissionalId: "ana" },
        { valorCobrado: 0, profissionalId: "ana" },
      ],
      { ana: 40 },
    );
    expect(r.ana).toEqual({ qtd: 2, totalCobrado: 100, comissao: 40 });
  });

  it("profissional só com cortesias: qtd > 0, total 0, comissão 0", () => {
    const r = comissaoPorProfissional(
      [
        { valorCobrado: 0, profissionalId: "bruno" },
        { valorCobrado: 0, profissionalId: "bruno" },
      ],
      { bruno: 50 },
    );
    expect(r.bruno).toEqual({ qtd: 2, totalCobrado: 0, comissao: 0 });
  });

  it("sem atendimentos no período → objeto vazio (total geral 0)", () => {
    const r = comissaoPorProfissional([], { ana: 40, bruno: 50 });
    expect(r).toEqual({});
    const total = Object.values(r).reduce((acc, x) => acc + x.comissao, 0);
    expect(total).toBe(0);
  });

  it("soma das comissões forma o total geral do período", () => {
    const r = comissaoPorProfissional(
      [
        { valorCobrado: 80, profissionalId: "ana" },
        { valorCobrado: 200, profissionalId: "bruno" },
        { valorCobrado: 0, profissionalId: "carla" },
      ],
      { ana: 40, bruno: 35, carla: 30 },
    );
    const total = Object.values(r).reduce((acc, x) => acc + x.comissao, 0);
    expect(total).toBe(102); // 32 + 70 + 0
  });
});
