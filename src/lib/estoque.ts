export function emAlerta({
  ativo,
  estoqueAtual,
  estoqueMinimo,
}: {
  ativo: boolean;
  estoqueAtual: number;
  estoqueMinimo: number;
}): boolean {
  return ativo && estoqueAtual < estoqueMinimo;
}
