import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { buildPrivatelenderPayload, internalSubmissionSchema } from '@/lib/privatelender/relay';
import { relayToPrivatelenderWithMode } from '@/lib/privatelender/http';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const client = getSupabaseServerClient();
  const { data: row, error } = await client
    .from('intake_submissions')
    .select('id, email, data')
    .eq('id', params.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Not found' }, { status: 404 });
  }

  const parse = internalSubmissionSchema.safeParse(row.data);
  if (!parse.success) {
    return NextResponse.json({ ok: false, error: parse.error.flatten() }, { status: 400 });
  }

  const injectedEmail = process.env.INJECTED_EMAIL || process.env.RELAY_EMAIL;
  if (!injectedEmail) {
    return NextResponse.json({ ok: false, error: 'Missing INJECTED_EMAIL env' }, { status: 500 });
  }
  const lenderPayload = buildPrivatelenderPayload(parse.data, injectedEmail);

  // Force submit regardless of global RELAY_MODE.
  const relayResult = await relayToPrivatelenderWithMode(lenderPayload, 'submit');

  // Best-effort status update. Ignore errors (schema may differ by deployment).
  await client
    .from('intake_submissions')
    .update({
      status: relayResult.ok ? 'sent_to_lender' : 'send_failed',
      relay_status_code: relayResult.status ?? null,
      relay_last_error: relayResult.ok ? null : relayResult.error,
      relay_response_body: relayResult.bodyText ?? null,
    })
    .eq('id', params.id);

  return NextResponse.json({ ok: relayResult.ok, relayResult, relayPreview: lenderPayload });
}
