# NHomesUSA — Private Lender Intake Replication

This Next.js app mirrors the "Get Terms" flow, asking the exact questions from PrivateLender's intake, without collecting the user's email. The backend stores submissions in Supabase and prepares a relay payload with an auto-injected email.

## Architecture
- Frontend: Next.js (App Router) single-page multi-step form (`components/MultiStepForm.tsx`).
- Backend: Next.js API route (`app/api/submit/route.ts`) for storing submissions and preparing lender payload.
- Storage: Supabase `intake_submissions` table for survey data + client metadata.
- Secrets: Environment variables for Supabase and `INJECTED_EMAIL` for relay.
 - Notifications: Optional SMTP email on every submission.

## Setup
1. Create Supabase project and add table using `supabase/schema.sql`.
2. Configure env in `.env.local`:
   - `SUPABASE_URL=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`
   - `INJECTED_EMAIL=your.email@domain.com`
   - `RELAY_MODE=preview` (default; use `submit` only after mapping the real lender request)
   - `PRIVATELENDER_ENDPOINT_URL=...` (from HAR)
   - `PRIVATELENDER_CONTENT_TYPE=form` (or `json`)
   - `PRIVATELENDER_HEADERS_JSON=...` (optional JSON headers)
   - `PRIVATELENDER_FIELD_MAP_JSON=...` (optional JSON mapping)
   - `PRIVATELENDER_STATIC_FIELDS_JSON=...` (optional JSON fixed fields)
   - `PRIVATELENDER_PAYLOAD_MODE=flat` (or `surecap-intake-form-update`)

   Optional: submission notification email (sent on every successful submission store)
   - `SENDGRID_API_KEY=...` (SendGrid API key with Mail Send permission)
   - `SUBMISSION_NOTIFY_TO=you@domain.com`
   - `SUBMISSION_NOTIFY_FROM=verified-sender@yourdomain.com` (must be verified in SendGrid)
   - `SENDGRID_TRANSPORT=api` (default) or `smtp`

   If using SMTP Relay (`SENDGRID_TRANSPORT=smtp`):
   - `SMTP_HOST=smtp.sendgrid.net`
   - `SMTP_PORT=587` (or `465`)
   - `SMTP_USER=apikey`
   - `SMTP_PASS=...` (can be the same as `SENDGRID_API_KEY`)
3. Install deps and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000 and complete the form. The final stage shows a summary. Submissions are saved; relay payload is returned but not sent.

## Relay (PrivateLender) support
Relay is implemented but disabled by default.

- Default behavior (`RELAY_MODE=preview`): stores to Supabase and returns `relayPreview` only.
- Enabled behavior (`RELAY_MODE=submit`): the server will POST to `PRIVATELENDER_ENDPOINT_URL` using either form-encoded or JSON body.

### Capturing the real endpoint/field names (HAR)
Because the PrivateLender flow is JS-driven, you’ll need to capture the real network request to get:
- the POST URL
- whether the body is JSON vs `x-www-form-urlencoded`
- required headers/tokens
- the exact field keys

Steps:
1. Open Chrome DevTools → Network, enable “Preserve log”
2. Go through the PrivateLender flow up to the final submit action
3. Export HAR
4. Run: `node scripts/extract-privatelender-har.mjs /path/to/file.har`

Use the reported POST entry to set `PRIVATELENDER_ENDPOINT_URL` and to populate `PRIVATELENDER_FIELD_MAP_JSON` / `PRIVATELENDER_STATIC_FIELDS_JSON`.

### Alternative: Playwright capture (no HAR export)
If you don’t want to export a HAR, you can capture the same request details using Playwright:

1. Install Playwright browsers once: `npx playwright install chromium`
2. Run: `npm run capture:privatelender`
3. A Chromium window opens. Step through the PrivateLender flow manually.
4. Right before the final submit, return to the terminal and press Enter.
5. The capture is saved under `captures/privatelender_capture_*.json`.
6. Run: `npm run extract:privatelender -- captures/privatelender_capture_*.json`

This prints candidate POST endpoints + payload snippets you can mirror.

### Captured endpoint (Playwright)
From the `captures/privatelender_capture_*.json` in this repo, the final submit request was:
- URL: `https://surecaplenders.net/privatelender/intake-form-update.php`
- Content-Type: `application/json`
- Payload shape:
   - top-level: `session_id`, `form_data`, `sent_timestamp`, `complete`
   - `form_data` keys include: `firstName`, `lastName`, `phoneNum`, `selectionTagsFICO`, `selectionTagsBorrowerBroker`, `selectionTagsPropertyType`, `loanPurpose`, `selectionTagsPurchaseRefinance`, `selectionTagsLoanType`, `selectionTagsBorrowerExperience`, plus other fields.

Recommended `.env.local` values to mirror that request:
- `PRIVATELENDER_ENDPOINT_URL=https://surecaplenders.net/privatelender/intake-form-update.php`
- `PRIVATELENDER_CONTENT_TYPE=json`
- `PRIVATELENDER_PAYLOAD_MODE=surecap-intake-form-update`
- `PRIVATELENDER_HEADERS_JSON={"accept":"*/*","origin":"https://www.privatelender.com","referer":"https://www.privatelender.com/"}`

## Field Mapping
The payload builder supports two formats:
- `PRIVATELENDER_PAYLOAD_MODE=flat` (legacy): uses `PRIVATELENDER_FIELD_MAP_JSON` to map internal keys into a flat key/value payload.
- `PRIVATELENDER_PAYLOAD_MODE=surecap-intake-form-update` (captured): sends nested JSON with `form_data` keys like `firstName`, `lastName`, `phoneNum`, and `selectionTags*` fields.

## Edge Cases & Handling
- Input validation via Zod; numeric parsing for `purchasePrice`.
- Phone accepted as free-form (can add lib formatting later).
- If envs missing, API returns 500 with message.
- Backend does not post to lender per request; ready to enable when needed.
- Retries: client can re-submit; consider idempotency keys if enabling external relay.

## Maintainability & Legality
- No proprietary CSS or images. Neutral UI.
- Email is never asked on UI; injected server-side.
- Supabase service key used only on server route; do not expose in client.

## Notes
- To route lender responses to your email, ensure `INJECTED_EMAIL` is your address.
- When enabling relay, confirm endpoint accepts these field names; adjust in `route.ts` as needed.
