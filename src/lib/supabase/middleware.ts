import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getLocaleFromPathname, getPathnameWithoutLocale, withLocalePath } from "@/lib/locale-path";

type Locale = "en" | "es";

export async function updateSession(
  request: NextRequest,
  initialResponse: NextResponse,
): Promise<NextResponse> {
  let supabaseResponse = initialResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = initialResponse;
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const path = getPathnameWithoutLocale(pathname);
  const loc = getLocaleFromPathname(pathname) as Locale;

  if (path.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = withLocalePath(loc, "/login");
    url.searchParams.set("next", pathname + (request.nextUrl.search || ""));
    return NextResponse.redirect(url);
  }

  if ((path === "/login" || path === "/signup") && user) {
    return NextResponse.redirect(new URL(withLocalePath(loc, "/admin"), request.url));
  }

  return supabaseResponse;
}
