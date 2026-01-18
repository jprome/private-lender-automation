import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  buildPrivatelenderPayload,
  internalSubmissionSchema,
} from "@/lib/privatelender/relay";
import AdminSubmissionReviewActions from "@/components/AdminSubmissionReviewActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AdminSubmissionReviewPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();

  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("intake_submissions")
    .select("id, created_at, status, email, data")
    .eq("id", params.id)
    .eq("branch", "db")
    .single();

  if (error || !data) return notFound();

  const injectedEmail = process.env.INJECTED_EMAIL || process.env.RELAY_EMAIL;
  if (!injectedEmail) {
    return (
      <main style={{ maxWidth: 960, margin: "32px auto", padding: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Review Before Send</h1>
          <Link prefetch={false} href={`/admin/submissions/${data.id}`}>
            ← Back
          </Link>
        </div>
        <p style={{ marginTop: 12, color: "#b00020" }}>
          Missing INJECTED_EMAIL (or RELAY_EMAIL) env. Cannot build preview
          payload.
        </p>
      </main>
    );
  }

  const parsed = internalSubmissionSchema.safeParse(data.data);
  if (!parsed.success) {
    return (
      <main style={{ maxWidth: 960, margin: "32px auto", padding: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Review Before Send</h1>
          <Link prefetch={false} href={`/admin/submissions/${data.id}`}>
            ← Back
          </Link>
        </div>
        <p style={{ marginTop: 12, color: "#b00020" }}>
          Submission data is invalid. Fix it on the edit screen before sending.
        </p>
        <pre
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fafafa",
            overflowX: "auto",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
            fontSize: 12,
            whiteSpace: "pre",
          }}
        >
          {JSON.stringify(parsed.error.flatten(), null, 2)}
        </pre>
      </main>
    );
  }

  const lenderPayload = buildPrivatelenderPayload(parsed.data, injectedEmail);

  return (
    <main style={{ maxWidth: 960, margin: "32px auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Review Before Send</h1>
        <Link prefetch={false} href={`/admin/submissions/${data.id}`}>
          ← Back
        </Link>
      </div>

      <div style={{ marginTop: 12, color: "#444" }}>
        <div>
          <strong>ID:</strong>{" "}
          <span
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
            }}
          >
            {data.id}
          </span>
        </div>
        <div>
          <strong>Created:</strong>{" "}
          {data.created_at ? new Date(data.created_at).toLocaleString() : ""}
        </div>
        <div>
          <strong>Current status:</strong> {data.status}
        </div>
        <div>
          <strong>Email (sent to lender):</strong> {injectedEmail}
        </div>
        <div>
          <strong>User email (stored):</strong> {data.email}
        </div>
      </div>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>
          PrivateLender Payload Preview
        </h2>
        <p style={{ marginTop: 6, color: "#666" }}>
          This is the exact JSON that will be POSTed when you confirm send.
        </p>
        <pre
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fafafa",
            overflowX: "auto",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
            fontSize: 12,
            whiteSpace: "pre",
          }}
        >
          {JSON.stringify(lenderPayload, null, 2)}
        </pre>
      </section>

      <AdminSubmissionReviewActions id={data.id} />
    </main>
  );
}
