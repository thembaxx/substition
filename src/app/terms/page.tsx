import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
export default function Terms() {
  return (
    <main className="legal-page" id="main">
      <a className="wordmark" href="/">
        <img src="/brand/mark.svg" width="32" height="32" alt="" />
        substition.
      </a>
      <p className="eyebrow">LOCAL-FIRST PREVIEW · 17 OCTOBER 2026</p>
      <h1>
        A few things,
        <br />
        clearly stated.
      </h1>
      <div className="notice">
        Preview terms. A commercial operator must supply its legal identity, contact details,
        governing terms and any required consumer rights information before selling this service.
      </div>
      <h2>What Substition does</h2>
      <p>
        Substition helps you record subscriptions, estimate recurring costs and find
        provider-managed cancellation paths. Records are entered by you or extracted as reviewable
        drafts. Estimates and merchant matches can be wrong. You are responsible for confirming
        amounts, dates, billing channels and contract terms.
      </p>
      <h2>You remain in control</h2>
      <p>
        Opening a cancellation guide, removing a tracker entry or marking an entry cancelled does
        not send a cancellation request. Finish cancellation with the provider and retain its
        confirmation. We do not have authority to cancel another merchant’s Apple, Google Play or
        Stripe subscription. Ending payment authorisation may not end a contract. Fees, refunds and
        continued access depend on your provider.
      </p>
      <h2>AI assistance</h2>
      <p>
        The optional local language model offers general, unverified suggestions. It cannot access
        your accounts, browse current pricing or take actions. Do not rely on its output as
        financial or legal advice. Model use is subject to the model’s applicable license and device
        compatibility.
      </p>
      <h2>Your device and backups</h2>
      <p>
        Your local vault depends on browser storage. Private browsing, storage eviction, device loss
        or clearing site data can permanently remove it. Keep encrypted backups and their passphrase
        separately. We cannot reset your vault passphrase. Browser security, malicious extensions
        and an already-unlocked device are outside the protection offered by local encryption.
      </p>
      <h2>Third-party services and marks</h2>
      <p>
        Merchant logos identify the services you track. All trademarks belong to their respective
        owners. Their presence does not imply endorsement, affiliation or a partnership. External
        sites, optional account delivery providers and model download hosts have their own terms.
      </p>
      <h2>Preview limitations</h2>
      <p>
        This preview has no paid plan or payment collection, no automatic email or bank scan and no
        cloud vault sync. It is provided for evaluation without a guarantee of uninterrupted
        availability or universal merchant coverage. Nothing in these terms limits rights or
        remedies that applicable law does not allow an operator to exclude.
      </p>
      <a className="back-link" href="/">
        <ArrowLeft size={17} /> Back to my workspace
      </a>
    </main>
  );
}
