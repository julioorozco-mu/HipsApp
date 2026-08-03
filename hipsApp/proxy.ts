import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rutas que NO requieren autenticación.
 * El middleware las deja pasar sin verificar sesión.
 */
const PUBLIC_ROUTES = new Set(["/acceso"]);

/**
 * Prefijos y archivos estáticos que el middleware debe ignorar por completo.
 */
function isStaticOrInternal(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/offline.html" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/icons/")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // No interceptar assets estáticos ni API routes
  if (isStaticOrInternal(pathname)) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refrescar la sesión (patrón recomendado por Supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ruta pública: si ya tiene sesión, redirigir al inicio
  if (PUBLIC_ROUTES.has(pathname)) {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Ruta protegida: si no tiene sesión, redirigir a /acceso
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/acceso";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - archivos con extensión (favicon.ico, etc.)
     */
    "/((?!_next/static|_next/image|.*\\..*$).*)",
  ],
};
