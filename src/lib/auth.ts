import bcrypt from "bcryptjs";

// Hash "descartável" (bcrypt de uma senha qualquer, cost 10). Comparado quando
// o usuário não existe, para o tempo de resposta não revelar se o usuário é
// válido — evita enumeração de usuários por timing.
export const HASH_DUMMY =
  "$2b$10$ycDJKWWfJOv1fCSVFXbiU.1dHq.K5T5gWl1.R8e9LaQI2uETM0QNW";

/**
 * Verifica a senha contra o hash do registro. Se `registro` for null, ainda
 * assim executa um `bcrypt.compare` contra o hash dummy (custo de tempo
 * equivalente) e retorna false.
 */
export async function autenticar(
  registro: { senhaHash: string } | null,
  senha: string,
): Promise<boolean> {
  const hash = registro?.senhaHash ?? HASH_DUMMY;
  const confere = await bcrypt.compare(senha, hash);
  return Boolean(registro) && confere;
}
