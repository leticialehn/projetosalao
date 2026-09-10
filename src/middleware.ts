import { NextResponse, type NextRequest } from "next/server";

// Conveniência de UX: manda quem não tem cookie de sessão direto para /login,
// sem renderizar a página protegida. A verificação AUTORITATIVA (validar o
// conteúdo do cookie) é feita no servidor, em src/app/(app)/layout.tsx —
// então uma eventual falha/bypass do middleware não expõe dados.
export function middleware(req: NextRequest) {
  const temCookie = req.cookies.has("salao_sessao");
  if (!temCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Tudo, exceto: /login, rotas internas do Next, arquivos estáticos e favicon.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
