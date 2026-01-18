import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import AdminSubmissionEditor from "@/components/AdminSubmissionEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("intake_submissions")
    .select("id, created_at, status, email, data, user_agent")
    .eq("id", params.id)
    .eq("branch", "db")
    .single();

  if (error || !data) return notFound();

  const injectedEmail =
    process.env.INJECTED_EMAIL || process.env.RELAY_EMAIL || "";
  const reviewData = data.data;

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
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Submission</h1>
        <Link prefetch={false} href="/admin/submissions">
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
          <strong>Status:</strong> {data.status}
        </div>
        <div>
          <strong>Email (sent to lender):</strong> {injectedEmail}
        </div>
        <div>
          <strong>User email (stored):</strong> {data.email}
        </div>
        <div>
          <strong>User Agent:</strong> {data.user_agent ?? ""}
        </div>
      </div>

      <AdminSubmissionEditor id={data.id} initialData={reviewData} />
    </main>
  );
}
