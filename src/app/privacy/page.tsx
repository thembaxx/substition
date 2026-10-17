import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
export default function Privacy() {
  return (
    <main className="legal-page" id="main">
      <a className="wordmark" href="/">
        <img src="/brand/mark.svg" width="32" height="32" alt="" />
        substition.
      </a>
      <p className="eyebrow">A PROMISE IN PLAIN ENGLISH · 17 OCTOBER 2026</p>
      <h1>
        Your life.
        <br />
        Your data.
      </h1>
      <div className="notice">
        This notice describes the local-first preview. Public commercial launch requires an
        identified legal operator and privacy contact, and updated processor and retention
        disclosures.
      </div>
      <h2>What stays on your device</h2>
      <p>
        Subscriptions, prices, billing dates and cancellation notes are encrypted using AES-GCM
        before saving to IndexedDB in your browser. A PBKDF2 key is derived locally from your vault
        passphrase. We do not store or transmit that passphrase or the vault contents. Demo changes
        are temporary and are not a personal vault.
      </p>
      <p>
        Imported CSVs and supported PDFs are read in browser memory. The original file is not
        uploaded or retained by this app. Only the subscription records you review and save enter
        your vault. Text PDF support is limited; scanned documents are not recognised.
      </p>
      <h2>Optional offline assistant</h2>
      <p>
        The assistant downloads a SmolLM2 model only when you choose to enable it. Model files come
        from Hugging Face and GitHub; those hosts receive network metadata such as your IP address.
        Chat inference runs in a worker on your device. Messages stay in memory and disappear when
        you close the assistant. Subscription context is off by default and is passed to the local
        model only if you enable it.
      </p>
      <p>
        Model weights are cached separately from the vault. You can unload the model or delete its
        downloaded files in the assistant. Browsers may evict cached models. AI responses may be
        inaccurate; no model can act on your subscriptions.
      </p>
      <h2>What a server can see</h2>
      <p>
        Opening the app makes normal web requests. Your hosting provider can receive IP addresses,
        request times and technical logs. There are no advertising pixels, remote fonts,
        merchant-logo requests or third-party analytics in this application. The merchant catalog
        and logos are bundled locally.
      </p>
      <p>
        If this deployment enables optional Better Auth email sign-in, the account database stores
        your email address, account and session records, and limited rate-limit records. Sign-in
        emails are delivered through Resend. That creates a separate account; it does not unlock or
        upload your local vault. Sessions last up to seven days and sign-in tokens expire after five
        minutes. Email providers may process their own delivery metadata.
      </p>
      <h2>No invisible connections</h2>
      <p>
        This release does not connect to your email provider, bank, payment processor or app-store
        purchase history. We do not sell your personal data. Merchant links open external sites only
        when you choose them. Those sites have their own terms and privacy policies.
      </p>
      <h2>Export, lock and delete</h2>
      <p>
        Export a passphrase-protected encrypted backup from your privacy settings. CSV exports and
        calendar exports are unencrypted and can reveal subscription details. Locking clears the
        decrypted workspace from app state. The vault also locks after five minutes in a hidden tab;
        browser process memory is managed by the browser and cannot be securely erased by
        JavaScript.
      </p>
      <p>
        Delete local vault removes the saved encrypted record on this device. It does not delete
        files you exported, downloaded AI models or optional server account records. Clear browser
        site storage to remove all local app storage and caches. We cannot recover lost passphrases
        or restore a deleted vault without your backup. No encrypted sync is active.
      </p>
      <h2>Your choices and rights</h2>
      <p>
        You may use the local workspace without an account. You can inspect, export and delete your
        records using the app. If an operator enables hosted accounts, that operator must publish
        contact details, lawful bases, subprocessor locations, retention periods and a process for
        access, correction and deletion requests before a public launch.
      </p>
      <a className="back-link" href="/">
        <ArrowLeft size={17} /> Back to a little clarity
      </a>
    </main>
  );
}
