"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconHome,
  IconWallet,
  IconPercent,
  IconCalendarCheck,
  IconUsers,
  IconPackage,
  IconUser,
  IconTag,
  IconReceipt,
  IconSettings,
  IconTarget,
} from "./icons";

const links = [
  { href: "/", label: "Agenda", dono: false, Icon: IconCalendar },
  { href: "/painel", label: "Painel do dia", dono: false, Icon: IconHome },
  { href: "/caixa", label: "Caixa", dono: false, Icon: IconWallet },
  { href: "/metas", label: "Metas", dono: true, Icon: IconTarget },
  { href: "/comissoes", label: "Comissões", dono: true, Icon: IconPercent },
  { href: "/agendamentos", label: "Agendamentos", dono: false, Icon: IconCalendarCheck },
  { href: "/clientes", label: "Clientes", dono: false, Icon: IconUsers },
  { href: "/produtos", label: "Produtos", dono: false, Icon: IconPackage },
  { href: "/profissionais", label: "Profissionais", dono: true, Icon: IconUser },
  { href: "/servicos", label: "Serviços", dono: true, Icon: IconTag },
  { href: "/taxas", label: "Taxas", dono: true, Icon: IconReceipt },
  { href: "/usuarios", label: "Usuários", dono: true, Icon: IconSettings },
];

export default function Nav({ papel }: { papel: string }) {
  const path = usePathname();
  const ehDono = papel === "DONO";
  const ehProfissional = papel === "PROFISSIONAL";
  return (
    <nav className="nav">
      {links
        .filter((l) => (ehProfissional ? l.href === "/" : !l.dono || ehDono))
        .map((l) => {
          const active =
            l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={active ? "active" : ""}>
              <l.Icon />
              {l.label}
            </Link>
          );
        })}
    </nav>
  );
}
