/**
 * Cria/atualiza o usuário "dono" a partir de variáveis de ambiente.
 *
 *   ADMIN_USER=dono ADMIN_PASSWORD=suaSenhaForte npm run db:seed:admin
 *
 * Sem flag: faz upsert (cria ou TROCA A SENHA do usuário existente).
 * Com `--ensure`: cria apenas se ainda não houver nenhum usuário; se já
 *   existir, não faz nada (usado no start do deploy, é seguro rodar sempre).
 * Se ADMIN_USER/ADMIN_PASSWORD não estiverem definidos no modo --ensure,
 *   apenas avisa e sai com sucesso (não bloqueia o boot).
 *
 * Nunca há senha em texto puro no repositório nem no banco (só o hash bcrypt).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const ensure = process.argv.includes("--ensure");
  const usuario = process.env.ADMIN_USER?.trim();
  const senha = process.env.ADMIN_PASSWORD;

  if (!usuario || !senha) {
    const msg = "ADMIN_USER e ADMIN_PASSWORD não definidos.";
    if (ensure) {
      console.warn(`${msg} Pulando criação do usuário admin.`);
      return;
    }
    console.error(msg);
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error("ADMIN_PASSWORD deve ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  if (ensure) {
    const jaExiste = await prisma.usuario.count();
    if (jaExiste > 0) {
      console.log("Usuário admin já existe. Nada a fazer.");
      return;
    }
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const registro = await prisma.usuario.upsert({
    where: { usuario },
    create: { usuario, senhaHash, papel: "DONO" },
    update: { senhaHash },
  });

  console.log(`Usuário "${registro.usuario}" (papel ${registro.papel}) pronto.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
