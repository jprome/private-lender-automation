import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function AdminSubmissionsPage() {
  noStore();
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from('intake_submissions')
    .select('id, created_at, status, email')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main style={{ maxWidth: 960, margin: '32px auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Submissions</h1>
        <form
          action={async () => {
            'use server';
          }}
        />
        <form action="/api/admin/logout" method="post">
          <button type="submit" style={{ padding: '8px 12px' }}>
            Logout
          </button>
        </form>
      </div>

      {error ? <p style={{ color: '#b00020' }}>Error: {error.message}</p> : null}

      <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f6f6f6' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 10 }}>Created</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Status</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Email</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row) => (
              <tr key={row.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
                  {row.created_at ? new Date(row.created_at).toLocaleString() : ''}
                </td>
                <td style={{ padding: 10 }}>{row.status}</td>
                <td style={{ padding: 10 }}>{row.email ?? ''}</td>
                <td style={{ padding: 10 }}>
                  <Link prefetch={false} href={`/admin/submissions/${row.id}`}>View / Edit</Link>
                </td>
              </tr>
            ))}
            {(data?.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 10, color: '#666' }}>
                  No submissions found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, color: '#666' }}>
        Showing the latest 50 submissions.
      </p>
    </main>
  );
}
