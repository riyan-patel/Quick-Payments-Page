import { type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { getPathnameWithoutLocale } from "@/lib/locale-path";
import { updateSession } from "@/lib/supabase/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

function needsSessionMutatingAuth(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/auth/callback") || pathname.includes("/auth/callback")) {
    return true;
  }
  const path = getPathnameWithoutLocale(pathname);
  return path.startsWith("/admin") || path === "/login" || path === "/signup";
}

export default async function proxy(request: NextRequest) {
  const intlRes = intlMiddleware(request);
  if (intlRes.status >= 300) {
    return intlRes;
  }
  if (!needsSessionMutatingAuth(request)) {
    return intlRes;
  }
  return updateSession(request, intlRes);
}

// Include "/" explicitly: the glob often does not match the bare root, so intl would not run
// for `/` and `app/[locale]/page.tsx` would not resolve (404).
export const config = {
  matcher: ["/", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
