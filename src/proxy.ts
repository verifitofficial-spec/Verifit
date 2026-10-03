import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutes = [
  { matches: (path: string) => path.startsWith('/admin') && path !== '/admin/login', role: 'admin', login: '/admin/login' },
  { matches: (path: string) => path.startsWith('/client/') && !path.startsWith('/client/login') && !path.startsWith('/client/register'), role: 'client', login: '/client/login' },
  { matches: (path: string) => path.startsWith('/trainer/') && !path.startsWith('/trainer/login') && !path.startsWith('/trainer/register'), role: 'trainer', login: '/trainer/login' },
] as const;

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Supabase explicitly recommends getUser() here; getSession() alone is not
  // sufficient for a trusted authorization decision.
  const { data: { user } } = await supabase.auth.getUser();
  const matchedRoute = protectedRoutes.find(({ matches }) => matches(request.nextUrl.pathname));

  if (!matchedRoute) return response;
  if (!user) return NextResponse.redirect(new URL(matchedRoute.login, request.url));

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== matchedRoute.role) {
    return NextResponse.redirect(new URL(matchedRoute.login, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
