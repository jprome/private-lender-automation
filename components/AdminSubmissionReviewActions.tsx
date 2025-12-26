'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSubmissionReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [relayResult, setRelayResult] = useState<unknown>(null);

  function formatApiError(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.message;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return 'Request failed';
    }
  }

  async function send() {
    setMessage(null);
    setError(null);
    setRelayResult(null);
    setBusy(true);
    try {
      const resp = await fetch(`/api/admin/submissions/${id}/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = (await resp.json()) as { ok: boolean; error?: unknown; relayResult?: unknown };
      if (!resp.ok || !json.ok) throw new Error(formatApiError(json.error) ?? 'Send failed');
      setRelayResult(json.relayResult ?? null);
      setMessage('Sent (or attempted). Status should update on refresh.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={busy} onClick={send} style={{ padding: '10px 14px' }}>
          {busy ? 'Working…' : 'Send to PrivateLender'}
        </button>
        <button disabled={busy} onClick={() => router.push(`/admin/submissions/${id}`)} style={{ padding: '10px 14px' }}>
          Back to Edit
        </button>
      </div>

      {message ? <p style={{ marginTop: 10, color: '#0a7a0a' }}>{message}</p> : null}
      {error ? <p style={{ marginTop: 10, color: '#b00020' }}>{error}</p> : null}

      {relayResult !== null ? (
        <details style={{ marginTop: 12 }}>
          <summary>relayResult</summary>
          <pre
            style={{
              marginTop: 10,
              padding: 12,
              border: '1px solid #ddd',
              borderRadius: 8,
              background: '#fafafa',
              overflowX: 'auto',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              fontSize: 12,
              whiteSpace: 'pre',
            }}
          >
            {JSON.stringify(relayResult, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
