import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Sair from "@/components/Sair";
import { lerSessao } from "@/lib/sessao";

// Guarda de autenticação: roda no servidor para toda rota dentro de (app).
// É a proteção autoritativa — o middleware é só conveniência de UX.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await lerSessao();
  if (!sessao.usuarioId) redirect("/login");

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Projeto Salão</div>
        <Nav />
        <Sair usuario={sessao.usuario ?? ""} />
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
