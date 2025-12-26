import { NextRequest, NextResponse } from 'next/server';
import { sendSubmissionNotificationEmail } from '@/lib/submissionNotifyEmail';

export async function POST(req: NextRequest) {
  const result = await sendSubmissionNotificationEmail({
    submissionId: `test_${Date.now()}`,
    userEmail: 'test@example.com',
    origin: req.nextUrl?.origin,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
