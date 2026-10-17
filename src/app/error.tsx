"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading-page">
      <h1>Let’s try that again.</h1>
      <p>Your saved vault stays on this device.</p>
      <button className="button primary" onClick={reset}>
        Reload this view
      </button>
    </main>
  );
}
