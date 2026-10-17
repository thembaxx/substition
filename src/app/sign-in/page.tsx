"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, EnvelopeSimple, LockKey } from "@phosphor-icons/react";
export default function SignIn() {
  const [configured, setConfigured] = useState<boolean | null>(null),
    [method, setMethod] = useState("magic"),
    [sent, setSent] = useState(false),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/auth-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => setConfigured(r.configured === true))
      .catch(() => setConfigured(false));
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(e.currentTarget);
    try {
      const endpoint =
        method === "magic"
          ? "sign-in/magic-link"
          : sent
            ? "sign-in/email-otp"
            : "email-otp/send-verification-otp";
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          method === "magic"
            ? { email, callbackURL: "/" }
            : sent
              ? { email, otp: data.get("otp") }
              : { email, type: "sign-in" },
        ),
      });
      if (!response.ok)
        throw new Error("Sign-in could not complete. Check your code or try again shortly.");
      if (sent && method === "otp") location.assign("/");
      else {
        setSent(true);
        setMessage(
          method === "magic"
            ? "Check your email for a sign-in link. It expires in 5 minutes."
            : "Check your email for a 6-digit code.",
        );
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="lock-page">
      <a href="/" className="wordmark">
        <img src="/brand/mark.svg" width="32" height="32" alt="" />
        substition.
      </a>
      <div className="lock-card auth-card">
        <span className="lock-emblem">
          <EnvelopeSimple size={40} weight="duotone" />
        </span>
        <p className="eyebrow">OPTIONAL ACCOUNT</p>
        <h1>
          A link.
          <br />A little less friction.
        </h1>
        <p>
          Email sign-in is separate from your encrypted local vault. It does not upload
          subscriptions or enable sync.
        </p>
        {configured === false ? (
          <div className="notice">
            <LockKey size={20} />
            <span>
              Email sign-in isn’t enabled on this deployment. You can use every local workspace
              feature without an account.
            </span>
          </div>
        ) : (
          <>
            <div className="segmented">
              <button
                className={method === "magic" ? "active" : ""}
                onClick={() => {
                  setMethod("magic");
                  setSent(false);
                  setMessage("");
                }}
              >
                Magic link
              </button>
              <button
                className={method === "otp" ? "active" : ""}
                onClick={() => {
                  setMethod("otp");
                  setSent(false);
                  setMessage("");
                }}
              >
                Email code
              </button>
            </div>
            <form onSubmit={(e) => void submit(e)}>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={sent}
                />
              </label>
              {sent && method === "otp" && (
                <label>
                  Your 6-digit code
                  <input
                    name="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </label>
              )}
              <button
                className="button primary full"
                disabled={busy || configured === null || (sent && method === "magic")}
              >
                {busy
                  ? "One moment…"
                  : sent && method === "otp"
                    ? "Verify & sign in"
                    : method === "magic"
                      ? "Send a sign-in link"
                      : "Send a code"}
                <ArrowRight size={17} />
              </button>
            </form>
            {sent && (
              <button
                className="text-button"
                onClick={() => {
                  setSent(false);
                  setMessage("");
                }}
              >
                Try another email
              </button>
            )}
          </>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <a className="text-button" href="/">
          <ArrowLeft size={16} /> Back to my local workspace
        </a>
        <p className="small muted">
          Signing in shares your email with the app’s account and email delivery providers. Your
          vault passphrase stays on your device.
        </p>
      </div>
    </main>
  );
}
