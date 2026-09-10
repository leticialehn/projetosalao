// Roda uma vez quando o servidor sobe. Falha o boot cedo e com mensagem clara
// se a configuração de sessão estiver ausente — em vez de o app subir e todo
// request quebrar depois.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "[projetosalao] SESSION_SECRET ausente ou com menos de 32 caracteres. " +
        "Defina no .env (local) ou nas variáveis do Railway (produção) antes de subir o app.",
    );
  }
}
