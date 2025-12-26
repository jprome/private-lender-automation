import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'ADMIN_TOKEN not configured' }, { status: 500 });
  }

  let provided = '';
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null);
    provided = String(form?.get('token') ?? '');
  } else {
    const body = (await req.json().catch(() => null)) as { token?: string } | null;
    provided = body?.token ?? '';
  }

  const isValid = Boolean(provided) && provided === expected;
  if (!isValid) {
    // For form posts, redirect back to login with an error.
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const url = new URL('/admin/login?error=1', req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });
  }

  // Redirect to submissions so the browser navigates automatically.
  const url = new URL('/admin/submissions', req.url);
  const resp = NextResponse.redirect(url);
  resp.cookies.set({
    name: 'admin_token',
    value: provided,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  });
  return resp;
}
