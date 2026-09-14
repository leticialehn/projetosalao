import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/sessao";
import FormLogin from "./FormLogin";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const sessao = await lerSessao();
  if (sessao.usuarioId) redirect("/");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 360, marginBottom: 0 }}>
        <div className="brand" style={{ padding: "0 0 16px" }}>
          Seu Salão
        </div>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>Entrar</h1>
        <FormLogin />
      </div>
    </div>
  );
}
