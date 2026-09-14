"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Agenda", dono: false },
  { href: "/painel", label: "Painel do dia", dono: false },
  { href: "/caixa", label: "Caixa", dono: false },
  { href: "/comissoes", label: "Comissões", dono: true },
  { href: "/agendamentos", label: "Agendamentos", dono: false },
  { href: "/clientes", label: "Clientes", dono: false },
  { href: "/profissionais", label: "Profissionais", dono: true },
  { href: "/servicos", label: "Serviços", dono: true },
  { href: "/taxas", label: "Taxas", dono: true },
  { href: "/usuarios", label: "Usuários", dono: true },
];

export default function Nav({ papel }: { papel: string }) {
  const path = usePathname();
  const ehDono = papel === "DONO";
  return (
    <nav className="nav">
      {links
        .filter((l) => !l.dono || ehDono)
        .map((l) => {
          const active =
            l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={active ? "active" : ""}>
              {l.label}
            </Link>
          );
        })}
    </nav>
  );
}
