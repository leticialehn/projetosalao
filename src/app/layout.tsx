import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Projeto Salão",
  description: "Agendamento e gestão para salão de beleza",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="layout">
          <aside className="sidebar">
            <div className="brand">Projeto Salão</div>
            <Nav />
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
