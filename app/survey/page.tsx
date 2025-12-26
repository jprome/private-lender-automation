import MultiStepForm from '@/components/MultiStepForm';

export default function SurveyPage() {
  return (
    <main className="container">
      <div className="card">
        <div className="topbar">
          <div>
            <h1 className="h1">Loan terms request</h1>
            <p className="p">No commitment. Real terms — no surprises.</p>
          </div>
          <a className="link" href="/welcome">Back</a>
        </div>
        <MultiStepForm />
      </div>
    </main>
  );
}
