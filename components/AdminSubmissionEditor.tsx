'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminSubmissionEditor({
  id,
  initialData,
}: {
  id: string;
  initialData: unknown;
}) {
  const router = useRouter();
  const initialText = useMemo(() => JSON.stringify(initialData, null, 2), [initialData]);
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function parseJsonOrThrow(): unknown {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON');
    }
  }

  function formatApiError(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.message;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return 'Request failed';
    }
  }

  async function save() {
    setMessage(null);
    setError(null);
    setBusy(true);
    try {
      const data = parseJsonOrThrow();
      const resp = await fetch(`/api/admin/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const json = (await resp.json()) as { ok: boolean; error?: unknown; data?: unknown };
      if (!resp.ok || !json.ok) throw new Error(formatApiError(json.error) ?? 'Save failed');
      if (json.data !== undefined) {
        setText(JSON.stringify(json.data, null, 2));
      }
      setMessage('Saved.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    router.push(`/admin/submissions/${id}/review`);
  }

  return (
    <section style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Edit Submission Data (JSON)</h2>
      <p style={{ marginTop: 6, color: '#666' }}>
        Saving validates against the same server schema used on intake.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        style={{
          marginTop: 12,
          width: '100%',
          minHeight: 420,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
          fontSize: 12,
          padding: 12,
          border: '1px solid #ccc',
          borderRadius: 8,
        }}
      />

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button disabled={busy} onClick={save} style={{ padding: '10px 14px' }}>
          {busy ? 'Working…' : 'Save'}
        </button>
        <button disabled={busy} onClick={send} style={{ padding: '10px 14px' }}>
          Review & Send
        </button>
      </div>

      {message ? <p style={{ marginTop: 10, color: '#0a7a0a' }}>{message}</p> : null}
      {error ? <p style={{ marginTop: 10, color: '#b00020' }}>{error}</p> : null}

      <details style={{ marginTop: 14 }}>
        <summary>Tips</summary>
        <ul>
          <li>Use Save after editing to ensure required fields are present.</li>
          <li>“Send” forces an actual relay POST regardless of RELAY_MODE.</li>
        </ul>
      </details>
    </section>
  );
}
