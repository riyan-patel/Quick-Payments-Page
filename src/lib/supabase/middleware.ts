import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getLocaleFromPathname, getPathnameWithoutLocale, withLocalePath } from "@/lib/locale-path";

type Locale = "en" | "es";

export async function updateSession(
  request: NextRequest,
  initialResponse: NextResponse,
): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    console.error(
      "[supabase/middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in Vercel → Settings → Environment Variables, then Redeploy.",
    );
    return initialResponse;
  }

  let supabaseResponse = initialResponse;

  const supabase = createServerClient(
    url,
    key,
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

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) user = data.user;
  } catch (e) {
    console.error("[supabase/middleware] getUser() failed; check Supabase URL/key and project status.", e);
    return initialResponse;
  }

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
