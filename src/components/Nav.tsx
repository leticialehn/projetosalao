"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Agenda" },
  { href: "/painel", label: "Painel do dia" },
  { href: "/caixa", label: "Caixa" },
  { href: "/comissoes", label: "Comissões" },
  { href: "/agendamentos", label: "Agendamentos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/profissionais", label: "Profissionais" },
  { href: "/servicos", label: "Serviços" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : ""}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
