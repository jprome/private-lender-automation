import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

export type SubmissionNotifyInput = {
  submissionId: string;
  userEmail?: string | null;
  origin?: string;
};

export async function sendSubmissionNotificationEmail(input: SubmissionNotifyInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const transport = (process.env.SENDGRID_TRANSPORT ?? 'api').toLowerCase();
  const to = process.env.SUBMISSION_NOTIFY_TO;
  const from = process.env.SUBMISSION_NOTIFY_FROM;
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!to) return { ok: false, error: 'SUBMISSION_NOTIFY_TO not configured' };
  if (!from) return { ok: false, error: 'SUBMISSION_NOTIFY_FROM not configured' };
  if (!apiKey) return { ok: false, error: 'SENDGRID_API_KEY not configured' };

  try {
    const adminLink = input.origin ? `${input.origin}/admin/submissions/${input.submissionId}` : null;
    const subject = `New submission received${input.userEmail ? `: ${input.userEmail}` : ''}`;

    const textLines = [
      'A new submission was received.',
      '',
      `Submission ID: ${input.submissionId}`,
      input.userEmail ? `User email: ${input.userEmail}` : null,
      adminLink ? `Admin link: ${adminLink}` : null,
    ].filter(Boolean) as string[];

    const html = `
      <div style="font-family: ui-sans-serif, system-ui; line-height: 1.4">
        <p><strong>A new submission was received.</strong></p>
        <p><strong>Submission ID:</strong> ${input.submissionId}</p>
        ${input.userEmail ? `<p><strong>User email:</strong> ${input.userEmail}</p>` : ''}
        ${adminLink ? `<p><a href="${adminLink}">Open in Admin</a></p>` : ''}
      </div>
    `;

    if (transport === 'smtp') {
      const host = process.env.SMTP_HOST || 'smtp.sendgrid.net';
      const port = Number(process.env.SMTP_PORT || '587');
      const secureEnv = (process.env.SMTP_SECURE ?? '').toLowerCase();
      const secure = secureEnv === 'true' || (secureEnv === '' && port === 465);
      const user = process.env.SMTP_USER || 'apikey';
      const pass = process.env.SMTP_PASS || apiKey;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });

      await transporter.sendMail({
        to,
        from,
        subject,
        text: textLines.join('\n'),
        html,
      });
    } else {
      sgMail.setApiKey(apiKey);
      await sgMail.send({
        to,
        from,
        subject,
        text: textLines.join('\n'),
        html,
      });
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Email send failed' };
  }
}
