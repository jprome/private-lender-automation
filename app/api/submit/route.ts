import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { buildPrivatelenderPayload, internalSubmissionSchema } from '@/lib/privatelender/relay';
import { sendSubmissionNotificationEmail } from '@/lib/submissionNotifyEmail';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parse = internalSubmissionSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ ok: false, error: parse.error.flatten() }, { status: 400 });
  }
  const data = parse.data;

  const injectedEmail = process.env.INJECTED_EMAIL || process.env.RELAY_EMAIL;
  if (!injectedEmail) {
    return NextResponse.json({ ok: false, error: 'Missing INJECTED_EMAIL env' }, { status: 500 });
  }

  const client = getSupabaseServerClient();
  const userAgent = req.headers.get('user-agent') || '';

  // Store submission
  const { data: inserted, error } = await client
    .from('intake_submissions')
    .insert({ email: data.email, data, user_agent: String(userAgent), status: 'pending_review', branch: 'db' })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const submissionId = inserted?.id ?? null;
  const notify = submissionId
    ? await sendSubmissionNotificationEmail({
        submissionId,
        userEmail: data.email,
        origin: req.nextUrl?.origin,
      })
    : { ok: false as const, error: 'Missing submissionId' };

  const lenderPayload = buildPrivatelenderPayload(data, injectedEmail);

  return NextResponse.json({
    ok: true,
    relayPreview: lenderPayload,
    submissionId,
    notifyOk: notify.ok,
    ...(notify.ok ? null : { notifyError: notify.error }),
  });
}
