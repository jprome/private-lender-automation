export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const hasError = Boolean(searchParams?.error);
  return (
    <main style={{ maxWidth: 720, margin: '32px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Admin Login</h1>
      <p style={{ marginTop: 8, color: '#666' }}>Enter the admin token to access submissions.</p>

      <form action="/api/admin/login" method="post" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <input
          type="password"
          name="token"
          placeholder="ADMIN_TOKEN"
          style={{ flex: 1, padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button style={{ padding: '10px 14px' }}>
          Sign in
        </button>
      </form>

      {hasError ? <p style={{ marginTop: 12, color: '#b00020' }}>Invalid token.</p> : null}

      <form action="/api/admin/logout" method="post" style={{ marginTop: 24 }}>
        <button type="submit" style={{ padding: '8px 12px' }}>
          Clear session
        </button>
      </form>
    </main>
  );
}
