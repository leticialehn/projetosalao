import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { opcoesSessao, type DadosSessao } from "@/lib/sessao-config";

// Primeira linha de defesa: valida (unseal) o cookie de sessão de verdade e
// redireciona para /login se não houver sessão. Também re-salva a sessão a cada
// request, o que faz a expiração ser por INATIVIDADE (sliding), não absoluta.
//
// A guarda em src/app/(app)/layout.tsx e o exigirSessao() nas server actions
// continuam existindo como defesa em profundidade (o middleware é contornável —
// CVE-2025-29927).
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const sessao = await getIronSession<DadosSessao>(req, res, opcoesSessao());

  if (!sessao.usuarioId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Renova a validade do cookie (sliding expiration).
  await sessao.save();
  return res;
}

export const config = {
  // Tudo, exceto: /login, rotas internas do Next, assets e favicon.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
