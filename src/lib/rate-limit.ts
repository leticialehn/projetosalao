// Limitador de tentativas em memória (por instância). Suficiente para 1 salão
// / 1 instância no Railway; zera a cada deploy. Não usar para nada que exija
// contagem exata distribuída.

interface Registro {
  falhas: number;
  primeira: number;
}

const MAX_FALHAS = 5;
const JANELA_MS = 15 * 60 * 1000; // 15 min

const registros = new Map<string, Registro>();

/** Segundos que a chave precisa esperar antes de nova tentativa. 0 = liberado. */
export function segundosDeEspera(chave: string, agora = Date.now()): number {
  const r = registros.get(chave);
  if (!r) return 0;
  if (agora - r.primeira > JANELA_MS) {
    registros.delete(chave);
    return 0;
  }
  if (r.falhas < MAX_FALHAS) return 0;
  return Math.ceil((r.primeira + JANELA_MS - agora) / 1000);
}

/** Registra uma tentativa que falhou. */
export function registrarFalha(chave: string, agora = Date.now()): void {
  const r = registros.get(chave);
  if (!r || agora - r.primeira > JANELA_MS) {
    registros.set(chave, { falhas: 1, primeira: agora });
    return;
  }
  r.falhas += 1;
}

/** Limpa o histórico da chave (chamar após um login bem-sucedido). */
export function limparTentativas(chave: string): void {
  registros.delete(chave);
}

/** Só para testes. */
export function _resetTudo(): void {
  registros.clear();
}
