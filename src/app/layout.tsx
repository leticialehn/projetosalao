import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
