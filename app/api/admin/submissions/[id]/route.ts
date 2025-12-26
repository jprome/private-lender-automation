import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { internalSubmissionSchema } from '@/lib/privatelender/relay';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => null)) as { data?: unknown } | null;
  if (!body || body.data === undefined) {
    return NextResponse.json({ ok: false, error: 'Missing data' }, { status: 400 });
  }

  const parse = internalSubmissionSchema.safeParse(body.data);
  if (!parse.success) {
    return NextResponse.json({ ok: false, error: parse.error.flatten() }, { status: 400 });
  }

  const client = getSupabaseServerClient();
  const { data: updatedRow, error } = await client
    .from('intake_submissions')
    .update({ data: parse.data, status: 'pending_review' })
    .eq('id', params.id)
    .select('id, data, status')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!updatedRow) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: updatedRow.data, status: updatedRow.status });
}
