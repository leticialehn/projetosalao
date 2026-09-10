import { sair } from "@/app/login/actions";

export default function Sair({ usuario }: { usuario: string }) {
  return (
    <form action={sair} style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
      {usuario && (
        <div className="muted" style={{ fontSize: 12, padding: "0 12px 8px" }}>
          {usuario}
        </div>
      )}
      <button type="submit" className="ghost" style={{ width: "100%" }}>
        Sair
      </button>
    </form>
  );
}
