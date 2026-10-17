import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Rotas privadas que exigem login (qualquer permissão)
  const rotasPrivadas = ["/", "/orcamentos", "/hoteis"];

  // 2. Rotas exclusivas de GESTOR (colaboradores/usuários comuns não entram)
  const rotasGestor = ["/hoteis"];

  const cookieAuth = request.cookies.get("fast_agencia_auth");

  let sessao = null;
  if (cookieAuth?.value) {
    try {
      sessao = JSON.parse(decodeURIComponent(cookieAuth.value));
    } catch {
      sessao = null;
    }
  }

  const estaAutenticado = Boolean(sessao?.id);

  // Se já estiver logado e tentar abrir a página de login, redireciona para a home
  if (pathname === "/login" && estaAutenticado) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Verifica se a rota atual exige autenticação
  const precisaAutenticacao = rotasPrivadas.some(
    (rota) => pathname === rota || (rota !== "/" && pathname.startsWith(rota))
  );

  // Redireciona para /login se não houver cookie de sessão válido
  if (precisaAutenticacao && !estaAutenticado) {
    const urlLogin = new URL("/login", request.url);
    return NextResponse.redirect(urlLogin);
  }

  // Se a rota for exclusiva de Gestor e o usuário tiver perfil "usuario", redireciona para a home
  const precisaSerGestor = rotasGestor.some(
    (rota) => pathname === rota || pathname.startsWith(rota)
  );

  if (precisaSerGestor && sessao?.permissao === "usuario") {
    const urlHome = new URL("/", request.url);
    return NextResponse.redirect(urlHome);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica em todas as rotas exceto:
     * - api (rotas de API)
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico e extensões de imagem comuns
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)",
  ],
};
