import { NextRequest, NextResponse } from 'next/server';

function isApi(pathname: string) {
  return pathname.startsWith('/api/');
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  // Allow login routes
  if (pathname === '/admin/login' || pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
    return NextResponse.next();
  }

  const expected = process.env.ADMIN_TOKEN;
  // If no token configured, lock down everything.
  if (!expected) {
    if (isApi(pathname)) {
      return NextResponse.json({ ok: false, error: 'ADMIN_TOKEN not configured' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  const provided = req.cookies.get('admin_token')?.value;
  if (provided && provided === expected) return NextResponse.next();

  if (isApi(pathname)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
