export type Category = "Entertainment" | "Productivity" | "Cloud & storage" | "Lifestyle";
export type BillingPlatform = "direct" | "apple" | "google" | "paypal" | "stripe";
export type Merchant = {
  id: string;
  name: string;
  category: Category;
  color: string;
  logo: string;
  aliases: string[];
  cancelUrl: string;
  instructions: string[];
};

// Catalog links are curated starting points, not evidence that a cancellation was completed.
export const merchants: Merchant[] = [
  {
    id: "spotify",
    name: "Spotify",
    category: "Entertainment",
    color: "#1ed760",
    logo: "spotify",
    aliases: ["spotify", "spotifyab"],
    cancelUrl: "https://www.spotify.com/account/subscription/",
    instructions: [
      "Sign in to the account that pays for your plan.",
      "Open your plan, then choose Change plan or Cancel Premium.",
      "Complete all confirmation steps and save the end date.",
    ],
  },
  {
    id: "netflix",
    name: "Netflix",
    category: "Entertainment",
    color: "#e50914",
    logo: "netflix",
    aliases: ["netflix", "nflx"],
    cancelUrl: "https://www.netflix.com/cancelplan",
    instructions: [
      "Sign in to your Netflix account.",
      "Review the cancellation and any remaining access.",
      "Confirm cancellation and save the confirmation.",
    ],
  },
  {
    id: "notion",
    name: "Notion",
    category: "Productivity",
    color: "#191919",
    logo: "notion",
    aliases: ["notion", "notionlabs"],
    cancelUrl: "https://www.notion.so/profile",
    instructions: [
      "Open the workspace that owns the subscription.",
      "In Settings, open Billing and review plan options.",
      "Downgrade or cancel, then save the effective date.",
    ],
  },
  {
    id: "icloud",
    name: "iCloud+",
    category: "Cloud & storage",
    color: "#459bfa",
    logo: "icloud",
    aliases: ["icloud", "icloudplus"],
    cancelUrl: "https://support.apple.com/108318",
    instructions: [
      "Open your Apple Account settings on your device.",
      "Open iCloud, then Manage Plan or Manage Account Storage.",
      "Choose a downgrade. Check storage limits before confirming.",
    ],
  },
  {
    id: "figma",
    name: "Figma",
    category: "Productivity",
    color: "#a259ff",
    logo: "figma",
    aliases: ["figma"],
    cancelUrl: "https://www.figma.com/settings",
    instructions: [
      "Sign in as the team or billing administrator.",
      "Open team settings and Billing.",
      "Review downgrade options, outstanding seats, and the effective date.",
    ],
  },
  {
    id: "youtube",
    name: "YouTube Premium",
    category: "Entertainment",
    color: "#ff0033",
    logo: "youtube",
    aliases: ["youtubepremium", "googleyoutube", "youtube"],
    cancelUrl: "https://www.youtube.com/paid_memberships",
    instructions: [
      "Open Paid memberships in your Google account.",
      "Select your membership and Manage membership.",
      "Choose Deactivate, then follow the cancellation steps.",
    ],
  },
  {
    id: "adobe",
    name: "Adobe",
    category: "Productivity",
    color: "#eb1000",
    logo: "adobe",
    aliases: ["adobe", "adobesystems"],
    cancelUrl: "https://account.adobe.com/plans",
    instructions: [
      "Open Plans in your Adobe account.",
      "Select Manage plan, then Cancel your plan.",
      "Review any early termination fee before you confirm.",
    ],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    category: "Cloud & storage",
    color: "#0061ff",
    logo: "dropbox",
    aliases: ["dropbox"],
    cancelUrl: "https://www.dropbox.com/account/plan",
    instructions: [
      "Sign in to the billing account.",
      "Open your plan and choose Cancel plan.",
      "Check storage changes and save the confirmation.",
    ],
  },
  {
    id: "canva",
    name: "Canva",
    category: "Productivity",
    color: "#00c4cc",
    logo: "canva",
    aliases: ["canva"],
    cancelUrl: "https://www.canva.com/settings/billing-and-plans",
    instructions: [
      "Open Billing & plans in your Canva settings.",
      "Select your plan and its cancellation option.",
      "Complete the confirmation and save the effective date.",
    ],
  },
  {
    id: "disney",
    name: "Disney+",
    category: "Entertainment",
    color: "#113ccf",
    logo: "disneyplus",
    aliases: ["disneyplus", "disney"],
    cancelUrl: "https://www.disneyplus.com/account",
    instructions: [
      "Open your Disney+ account.",
      "Select your subscription and Cancel subscription.",
      "If billed by a partner, manage it with that billing provider.",
    ],
  },
  {
    id: "headspace",
    name: "Headspace",
    category: "Lifestyle",
    color: "#f47c37",
    logo: "headspace",
    aliases: ["headspace"],
    cancelUrl: "https://my.headspace.com/",
    instructions: [
      "Sign in to your Headspace account.",
      "Open subscription management.",
      "Turn off renewal and save your confirmation.",
    ],
  },
  {
    id: "github",
    name: "GitHub",
    category: "Productivity",
    color: "#24292f",
    logo: "github",
    aliases: ["github"],
    cancelUrl: "https://github.com/settings/billing",
    instructions: [
      "Open Billing and licensing for the correct account.",
      "Review the paid plan or product you want to change.",
      "Downgrade or cancel and save the confirmation.",
    ],
  },
];

export const categories: Category[] = [
  "Entertainment",
  "Productivity",
  "Cloud & storage",
  "Lifestyle",
];
export const catalogVersion = "2026-10-17.1";

export function normalizeMerchant(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function matchMerchant(value: string) {
  const normalized = normalizeMerchant(value);
  return merchants.find((merchant) => merchant.aliases.some((alias) => normalized.includes(alias)));
}

export function cancellationRoute(providerId: string, platform: BillingPlatform) {
  if (platform === "apple")
    return {
      url: "https://apps.apple.com/account/subscriptions",
      title: "Open Apple subscriptions",
      steps: [
        "Sign in with the Apple Account used to subscribe.",
        "Select the subscription and review its renewal date.",
        "Choose Cancel Subscription and save the confirmation.",
      ],
      note: "Apple controls this subscription. Substition cannot cancel it for you.",
    };
  if (platform === "google")
    return {
      url: "https://play.google.com/store/account/subscriptions",
      title: "Open Google Play",
      steps: [
        "Use the Google Account that owns this subscription.",
        "Choose the subscription, then Manage and Cancel subscription.",
        "Complete the confirmation and record the effective date.",
      ],
      note: "Google Play controls this subscription. Uninstalling an app does not cancel it.",
    };
  if (platform === "paypal")
    return {
      url: "https://www.paypal.com/myaccount/autopay/",
      title: "Open PayPal payments",
      steps: [
        "Open your automatic payments.",
        "Choose the merchant and review the payment agreement.",
        "Contact the merchant about your contract as well as stopping the payment.",
      ],
      note: "Stopping a payment agreement may not end your contract with the merchant.",
    };
  const merchant = merchants.find((m) => m.id === providerId);
  return {
    url: merchant?.cancelUrl,
    title: platform === "stripe" ? "Open merchant billing" : "Manage subscription",
    steps: merchant?.instructions ?? [
      "Open your provider's official website.",
      "Find account settings and billing.",
      "Follow cancellation steps and keep proof.",
    ],
    note:
      platform === "stripe"
        ? "Only the merchant can issue a portal session for its Stripe account. Open their billing page."
        : "You stay in control. Confirm cancellation with your provider before marking it here.",
  };
}
