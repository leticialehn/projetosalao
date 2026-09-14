import Nav from "@/components/Nav";
import Sair from "@/components/Sair";
import { IconLeaf } from "@/components/icons";
import { exigirSessao } from "@/lib/sessao";

// Guarda de autenticação para o render das páginas de (app). As server actions
// têm a sua própria guarda (exigirSessao no topo de cada uma) e o middleware
// valida o cookie antes — três camadas independentes.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await exigirSessao();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <IconLeaf />
          Seu Salão
        </div>
        <Nav papel={sessao.papel} />
        <Sair usuario={sessao.usuario} papel={sessao.papel} />
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
