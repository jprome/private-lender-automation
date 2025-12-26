import Link from 'next/link';
import Image from 'next/image';

export default function WelcomePage() {
  return (
    <main className="container container-center">
      <div className="card hero">
        <div className="hero-header">
          <div className="hero-logo" aria-hidden="true">
            <Image
              src="/logo.jpg"
              alt=""
              width={72}
              height={72}
              priority
              className="hero-logo-img"
            />
          </div>
          <div className="hero-brand">
            <div className="hero-badge">NHomesUSA</div>
          </div>
        </div>
        <h1 className="h1">Get terms in under 3 minutes</h1>
        <p className="p">
          Answer a few questions about the property and your loan request. Submissions are reviewed before being sent to the lender.
        </p>

        <div className="hero-grid">
          <div className="hero-item">
            <div className="hero-title">Fast</div>
            <div className="hero-text">Simple multi-step form with progress tracking.</div>
          </div>
          <div className="hero-item">
            <div className="hero-title">Reviewed</div>
            <div className="hero-text">We can validate and send only the submissions we approve.</div>
          </div>
        </div>

        <div className="button-row" style={{ marginTop: 18 }}>
          <Link className="link" href="/admin">Admin</Link>
          <Link className="button" href="/survey">Start survey</Link>
        </div>
      </div>
    </main>
  );
}
