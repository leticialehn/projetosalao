import { prisma } from "@/lib/prisma";
import { exigirPapel, PAPEL_DONO } from "@/lib/sessao";
import { dataHora } from "@/lib/format";
import Usuarios from "./Usuarios";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sessao = await exigirPapel(PAPEL_DONO);

  const [usuarios, profissionaisDisponiveis] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: [{ papel: "asc" }, { usuario: "asc" }],
      select: {
        id: true,
        usuario: true,
        papel: true,
        criadoEm: true,
        profissional: { select: { nome: true } },
      },
    }),
    prisma.profissional.findMany({
      where: { ativo: true, usuario: null },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const totalDonos = usuarios.filter((u) => u.papel === PAPEL_DONO).length;

  return (
    <>
      <h1>Usuários</h1>
      <p className="subtitle">Quem pode acessar o sistema</p>

      <Usuarios
        usuarios={usuarios.map((u) => ({
          ...u,
          criadoEm: dataHora(u.criadoEm),
          profissionalNome: u.profissional?.nome ?? null,
        }))}
        usuarioAtualId={sessao.usuarioId}
        totalDonos={totalDonos}
        profissionaisDisponiveis={profissionaisDisponiveis}
      />
    </>
  );
}
