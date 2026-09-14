import { sair } from "@/app/login/actions";
import { IconChevronDown } from "./icons";

const PAPEL_LABEL: Record<string, string> = { DONO: "Dono", BALCAO: "Balcão" };

export default function Sair({
  usuario,
  papel,
}: {
  usuario: string;
  papel: string;
}) {
  const inicial = usuario ? usuario[0].toUpperCase() : "?";
  return (
    <form action={sair} className="sidebar-footer">
      <button type="submit" className="user-chip" title="Sair">
        <span className="avatar">{inicial}</span>
        <span className="user-info">
          <span className="user-name">{usuario || "Usuário"}</span>
          {papel && <span className="user-papel">{PAPEL_LABEL[papel] ?? papel}</span>}
        </span>
        <IconChevronDown size={16} className="chevron" />
      </button>
    </form>
  );
}
