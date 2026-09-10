import { sair } from "@/app/login/actions";

const PAPEL_LABEL: Record<string, string> = { DONO: "Dono", BALCAO: "Balcão" };

export default function Sair({
  usuario,
  papel,
}: {
  usuario: string;
  papel: string;
}) {
  return (
    <form
      action={sair}
      style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}
    >
      {usuario && (
        <div className="muted" style={{ fontSize: 12, padding: "0 12px 8px" }}>
          {usuario}
          {papel && ` · ${PAPEL_LABEL[papel] ?? papel}`}
        </div>
      )}
      <button type="submit" className="ghost" style={{ width: "100%" }}>
        Sair
      </button>
    </form>
  );
}
