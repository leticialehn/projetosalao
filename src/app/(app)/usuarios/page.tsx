import { prisma } from "@/lib/prisma";
import { exigirPapel, PAPEL_DONO } from "@/lib/sessao";
import { dataHora } from "@/lib/format";
import Usuarios from "./Usuarios";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sessao = await exigirPapel(PAPEL_DONO);

  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ papel: "asc" }, { usuario: "asc" }],
    select: { id: true, usuario: true, papel: true, criadoEm: true },
  });

  const totalDonos = usuarios.filter((u) => u.papel === PAPEL_DONO).length;

  return (
    <>
      <h1>Usuários</h1>
      <p className="subtitle">Quem pode acessar o sistema</p>

      <Usuarios
        usuarios={usuarios.map((u) => ({
          ...u,
          criadoEm: dataHora(u.criadoEm),
        }))}
        usuarioAtualId={sessao.usuarioId}
        totalDonos={totalDonos}
      />
    </>
  );
}
