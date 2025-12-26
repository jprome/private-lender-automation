export type RelayResult =
  | { ok: true; status: number; bodyText: string }
  | { ok: false; status?: number; error: string; bodyText?: string };

function safeJson(value: string | undefined): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}

async function postOnce(url: string, headers: Record<string, string>, body: string): Promise<RelayResult> {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body,
      redirect: 'manual',
    });
    const text = await resp.text();
    if (!resp.ok) {
      return { ok: false, status: resp.status, error: `Relay failed with status ${resp.status}`, bodyText: text };
    }
    return { ok: true, status: resp.status, bodyText: text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Relay failed' };
  }
}

export async function relayToPrivatelender(payload: unknown): Promise<RelayResult> {
  return relayToPrivatelenderWithMode(payload);
}

export async function relayToPrivatelenderWithMode(
  payload: unknown,
  modeOverride?: 'preview' | 'submit'
): Promise<RelayResult> {
  const url = process.env.PRIVATELENDER_ENDPOINT_URL;
  if (!url) return { ok: false, error: 'Missing PRIVATELENDER_ENDPOINT_URL' };

  const mode = (modeOverride ?? (process.env.RELAY_MODE ?? 'preview')).toLowerCase();
  if (mode !== 'submit') {
    return { ok: true, status: 200, bodyText: 'Relay disabled (RELAY_MODE != submit)' };
  }

  const contentType = (process.env.PRIVATELENDER_CONTENT_TYPE ?? 'form').toLowerCase();
  const extraHeaders = safeJson(process.env.PRIVATELENDER_HEADERS_JSON) as Record<string, string> | undefined;

  const headers: Record<string, string> = {
    ...extraHeaders,
  };

  let body: string;
  if (contentType === 'json') {
    headers['content-type'] = 'application/json';
    // Optional: mimic browser behavior for Surecap endpoint by sending a partial update
    // (complete=false) before the final complete=true submit. This can be important if
    // backend workflows (like confirmation emails) trigger on state transition.
    const twoStage = (process.env.PRIVATELENDER_TWO_STAGE ?? '').toLowerCase() === 'true';
    if (twoStage && isRecord(payload) && payload.complete === true && typeof payload.session_id === 'string' && isRecord(payload.form_data)) {
      const formData = payload.form_data as Record<string, unknown>;
      // Browser flow posts multiple complete=false updates as the user progresses.
      // Sending the full form_data as a draft (complete=false) is a closer mimic than a minimal subset.
      const draftFormData = { ...formData };
      const draftPayload = {
        session_id: payload.session_id,
        form_data: draftFormData,
        sent_timestamp: Date.now(),
        complete: false,
      };

      const draftBody = JSON.stringify(draftPayload);
      const draftResult = await postOnce(url, headers, draftBody);
      if (!draftResult.ok) return draftResult;

      body = JSON.stringify({ ...payload, sent_timestamp: Date.now() });
      const finalResult = await postOnce(url, headers, body);
      if (!finalResult.ok) return finalResult;

      return {
        ok: true,
        status: finalResult.status,
        bodyText: JSON.stringify({ draft: draftResult.bodyText, final: finalResult.bodyText }),
      };
    }

    body = JSON.stringify(payload);
  } else {
    headers['content-type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
    if (typeof payload !== 'object' || payload === null) {
      return { ok: false, error: 'Form relay requires an object payload' };
    }
    const entries: string[][] = Object.entries(payload as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]);
    body = new URLSearchParams(entries).toString();
  }

  return await postOnce(url, headers, body);
}
