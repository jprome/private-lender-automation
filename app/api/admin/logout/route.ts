import { NextResponse } from 'next/server';

export async function POST() {
  const resp = NextResponse.json({ ok: true });
  resp.cookies.set({
    name: 'admin_token',
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return resp;
}
