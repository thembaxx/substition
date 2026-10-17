"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  Bell,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChartBar,
  Check,
  CheckCircle,
  CloudSlash,
  DownloadSimple,
  EnvelopeSimple,
  Fingerprint,
  House,
  Info,
  Leaf,
  ListBullets,
  LockKey,
  MagnifyingGlass,
  Moon,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  Sun,
  Trash,
  TrendDown,
  UploadSimple,
  UserCircle,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { cancellationRoute, categories } from "@/lib/catalog";
import {
  currencyDigits,
  daysUntil,
  demoWorkspace,
  isLive,
  localISO,
  money,
  monthlyMinor,
  nextOccurrence,
  occurrences,
  parseDate,
  supportedCurrencies,
  todayISO,
  toMinor,
  totals,
  upcoming,
  type Subscription,
  type Workspace,
} from "@/lib/subscriptions";
import {
  deriveKey,
  encryptWorkspace,
  readVault,
  unlockWorkspace,
  validateEnvelope,
  writeVault,
  type Envelope,
} from "@/lib/vault";
import { calendarICS, downloadFile, exportCSV } from "@/lib/export";
import Dialog from "./dialog";
import SubscriptionForm, { MerchantLogo } from "./subscription-form";
import ImportPanel from "./import-panel";
import NativeSupport from "./native-support";
import Ambient from "./ambient";
const OfflineAssistant = dynamic(() => import("./offline-assistant"), {
  ssr: false,
  loading: () => <p className="muted">Opening your private assistant…</p>,
});
type View = "overview" | "subscriptions" | "calendar" | "insights";
type Panel =
  | "add"
  | "import"
  | "settings"
  | "create"
  | "assistant"
  | "install"
  | "budget"
  | "erase"
  | null;
const views = [
  { id: "overview", label: "Overview", icon: House },
  { id: "subscriptions", label: "Subscriptions", icon: ListBullets },
  { id: "calendar", label: "Calendar", icon: CalendarBlank },
  { id: "insights", label: "Insights", icon: ChartBar },
] as const;
const emptyWorkspace = (): Workspace => ({
  version: 1,
  subscriptions: [],
  currency: "USD",
  budgetMinor: 12000,
});
const dateLabel = (
  date: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) => new Intl.DateTimeFormat(undefined, options).format(parseDate(date));

export default function WorkspaceApp() {
  const [workspace, setWorkspace] = useState<Workspace>(demoWorkspace),
    [mode, setMode] = useState<"demo" | "private" | "locked">("demo"),
    [checking, setChecking] = useState(true),
    [view, setView] = useState<View>("overview"),
    [panel, setPanel] = useState<Panel>(null),
    [selected, setSelected] = useState<Subscription | null>(null),
    [editing, setEditing] = useState(false),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [filter, setFilter] = useState("active"),
    [theme, setTheme] = useState(() => {
      if (typeof window === "undefined") return "system";
      try {
        const saved = localStorage.getItem("substition-theme");
        return saved && ["system", "light", "dark"].includes(saved) ? saved : "system";
      } catch {
        return "system";
      }
    }),
    [resolvedTheme, setResolvedTheme] = useState("light"),
    [toast, setToast] = useState(""),
    [storageError, setStorageError] = useState(""),
    [saveStatus, setSaveStatus] = useState("saved"),
    [envelope, setEnvelope] = useState<Envelope | null>(null),
    [vaultError, setVaultError] = useState(""),
    [vaultBusy, setVaultBusy] = useState(false),
    [installAction, setInstallAction] = useState<(() => void) | null>(null),
    [playful, setPlayful] = useState(false),
    [undo, setUndo] = useState<Subscription | null>(null);
  const keyRef = useRef<CryptoKey | null>(null),
    saltRef = useRef<Uint8Array | null>(null),
    saveQueue = useRef<Promise<void>>(Promise.resolve()),
    saveFailed = useRef(false),
    brandClicks = useRef(0),
    initialized = useRef(false);
  const notify = useCallback((message: string) => setToast(message), []);
  const updateInstall = useCallback(
    (action: (() => void) | null) => setInstallAction(() => action),
    [],
  );
  // External browser state is read after hydration; keep the server render deterministic.
  // oxlint-disable react/set-state-in-effect
  useEffect(() => {
    let live = true;
    readVault()
      .then((e) => {
        if (!live) return;
        if (e) {
          setEnvelope(e);
          setWorkspace(emptyWorkspace());
          setMode("locked");
        }
      })
      .catch(() => {
        if (live)
          setStorageError(
            "Browser storage is unavailable. Demo changes are temporary. Enable site storage before creating a vault.",
          );
      })
      .finally(() => {
        if (live) {
          setChecking(false);
          initialized.current = true;
        }
      });
    const params = new URLSearchParams(location.search);
    if (views.some((v) => v.id === params.get("view"))) setView(params.get("view") as View);
    if (params.get("action") === "add") setPanel("add");
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (manifest) manifest.href = dark ? "/manifest-dark.webmanifest" : "/manifest.webmanifest";
      setResolvedTheme(dark ? "dark" : "light");
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
        m.removeAttribute("media");
        m.content = dark ? "#101512" : "#f9faf7";
      });
      try {
        localStorage.setItem("substition-theme", theme);
      } catch {}
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    if (!initialized.current || mode !== "private" || !keyRef.current || !saltRef.current) return;
    setSaveStatus("saving");
    const key = keyRef.current,
      salt = saltRef.current;
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(async () => {
        const saved = await encryptWorkspace(workspace, key, salt);
        await writeVault(saved);
        saveFailed.current = false;
        setEnvelope(saved);
        setSaveStatus("saved");
        setStorageError("");
      })
      .catch(() => {
        saveFailed.current = true;
        setSaveStatus("error");
        setStorageError(
          "This change could not be saved. Keep this page open and export a backup before closing.",
        );
      });
  }, [workspace, mode]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  const lock = useCallback(async () => {
    await saveQueue.current;
    if (saveFailed.current) {
      notify("Export a backup before locking; the last save failed.");
      return;
    }
    keyRef.current = null;
    saltRef.current = null;
    setWorkspace(emptyWorkspace());
    setMode("locked");
    setPanel(null);
    setSelected(null);
    setVaultError("");
  }, [notify]);
  useEffect(() => {
    if (mode !== "private") return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const visibility = () => {
      if (document.hidden) timeout = setTimeout(() => void lock(), 5 * 60 * 1000);
      else clearTimeout(timeout);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [mode, lock]);
  useEffect(() => {
    if (saveStatus !== "saving" && saveStatus !== "error") return;
    const prevent = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [saveStatus]);

  // oxlint-enable react/set-state-in-effect
  const live = useMemo(() => workspace.subscriptions.filter(isLive), [workspace.subscriptions]);
  const allTotals = useMemo(() => totals(workspace.subscriptions), [workspace.subscriptions]);
  const monthly = allTotals[workspace.currency] ?? 0;
  const coming = useMemo(() => upcoming(workspace.subscriptions), [workspace.subscriptions]);
  const trials = live
    .filter((s) => s.status === "trial")
    .sort((a, b) => nextOccurrence(a).localeCompare(nextOccurrence(b)));
  const overlapGroups = categories
    .map((c) => ({ category: c, subs: live.filter((s) => s.category === c) }))
    .filter((g) => g.subs.length > 1);
  const entertainment = live
    .filter((s) => s.category === "Entertainment" && s.currency === workspace.currency)
    .sort((a, b) => monthlyMinor(a) - monthlyMinor(b));
  const potential = entertainment.length > 1 ? monthlyMinor(entertainment[0]) : 0;
  const filtered = workspace.subscriptions
    .filter(
      (s) =>
        (category === "All" || s.category === category) &&
        (filter === "all" || (filter === "active" && isLive(s)) || s.status === filter) &&
        `${s.name} ${s.plan}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => nextOccurrence(a).localeCompare(nextOccurrence(b)));
  function navigate(next: View) {
    setView(next);
    setSelected(null);
    setPanel(null);
    setQuery("");
    if (next === "overview") {
      setFilter("active");
      setCategory("All");
    }
    const url = new URL(location.href);
    url.searchParams.set("view", next);
    url.searchParams.delete("action");
    history.replaceState(null, "", url);
    window.scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }
  function save(sub: Subscription) {
    if (
      workspace.subscriptions.length >= 2000 &&
      !workspace.subscriptions.some((s) => s.id === sub.id)
    ) {
      notify(
        "This workspace supports up to 2,000 subscriptions. Export and archive older entries first.",
      );
      return;
    }
    setWorkspace((w) => ({
      ...w,
      subscriptions: w.subscriptions.some((s) => s.id === sub.id)
        ? w.subscriptions.map((s) => (s.id === sub.id ? sub : s))
        : [...w.subscriptions, sub],
    }));
    setSelected(null);
    setEditing(false);
    setPanel(null);
    notify(
      `${sub.name} ${editing ? "updated" : "added"}. ${mode === "demo" ? "Demo changes last for this visit." : "Your local vault is saving."}`,
    );
  }
  function remove(sub: Subscription) {
    setWorkspace((w) => ({ ...w, subscriptions: w.subscriptions.filter((s) => s.id !== sub.id) }));
    setUndo(sub);
    setSelected(null);
    notify(`${sub.name} removed from your tracker. This does not cancel it.`);
  }
  async function openVault(event: FormEvent<HTMLFormElement>, create = false) {
    event.preventDefault();
    setVaultBusy(true);
    setVaultError("");
    const password = String(new FormData(event.currentTarget).get("passphrase") ?? "");
    try {
      if (create) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await deriveKey(password, salt);
        const fresh = emptyWorkspace();
        const saved = await encryptWorkspace(fresh, key, salt);
        await writeVault(saved);
        keyRef.current = key;
        saltRef.current = salt;
        setWorkspace(fresh);
        setEnvelope(saved);
        setMode("private");
        setPanel(null);
        await navigator.storage?.persist?.();
        notify("Your private workspace is ready. Keep your passphrase safe.");
      } else if (envelope) {
        const result = await unlockWorkspace(envelope, password);
        keyRef.current = result.key;
        saltRef.current = result.salt;
        setWorkspace(result.workspace);
        setMode("private");
        setSaveStatus("saved");
      }
    } catch (e) {
      setVaultError(e instanceof Error ? e.message : "The vault could not be opened.");
    } finally {
      setVaultBusy(false);
    }
  }
  async function backup() {
    try {
      await saveQueue.current;
      if (!keyRef.current || !saltRef.current) {
        notify("Create a private vault to export an encrypted backup.");
        return;
      }
      const saved = await encryptWorkspace(workspace, keyRef.current, saltRef.current);
      downloadFile(
        `substition-${todayISO()}.vault.json`,
        JSON.stringify(saved),
        "application/json",
      );
      notify("Encrypted backup exported. You need your passphrase to restore it.");
    } catch {
      notify("Backup failed. Please try again before closing this page.");
    }
  }
  const table = (limit?: number) => (
    <div className="subscription-list">
      <div className="table-heading">
        <span>Subscription</span>
        <span>Next payment</span>
        <span>Amount</span>
        <span />
      </div>
      {(limit ? filtered.slice(0, limit) : filtered).map((sub) => (
        <button
          className="subscription-row"
          key={sub.id}
          onClick={() => {
            setSelected(sub);
            setEditing(false);
          }}
        >
          <span className="subscription-identity">
            <MerchantLogo providerId={sub.providerId} />
            <span>
              <strong>{sub.name}</strong>
              <small>{sub.plan}</small>
            </span>
          </span>
          <span className="renewal-cell">
            <span>{dateLabel(nextOccurrence(sub))}</span>
            <small>
              {sub.status === "trial"
                ? daysUntil(sub.nextCharge) < 0
                  ? "Trial needs review"
                  : "Trial ends"
                : isLive(sub)
                  ? `${daysUntil(nextOccurrence(sub))} days away`
                  : sub.status}
            </small>
          </span>
          <span className="amount-cell">
            <strong>{money(sub.amountMinor, sub.currency)}</strong>
            <small>
              /{" "}
              {sub.interval === "annual"
                ? "year"
                : sub.interval === "quarterly"
                  ? "quarter"
                  : sub.interval === "weekly"
                    ? "week"
                    : "month"}
            </small>
          </span>
          <CaretRight size={17} />
        </button>
      ))}
      {!filtered.length && (
        <div className="empty-state">
          <Leaf size={34} weight="duotone" />
          <h3>
            {workspace.subscriptions.length
              ? "A little too quiet here."
              : "A fresh start feels good."}
          </h3>
          <p>
            {workspace.subscriptions.length
              ? "Try another search or filter."
              : "Add your first subscription. Everything stays on this device."}
          </p>
          <button
            className="button secondary"
            onClick={() =>
              workspace.subscriptions.length
                ? (setQuery(""), setCategory("All"), setFilter("all"))
                : setPanel("add")
            }
          >
            {workspace.subscriptions.length ? "Reset filters" : "Add your first subscription"}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );

  if (checking)
    return (
      <main className="loading-page" aria-busy="true">
        <img src="/brand/icon-192.png" width="56" height="56" alt="Substition" />
        <p>Making room for a little clarity.</p>
        <span className="loading-line" />
      </main>
    );
  if (mode === "locked")
    return (
      <>
        <Ambient />
        <main className="lock-page" id="main">
          <a href="/" className="wordmark">
            <img src="/brand/mark.svg" width="32" height="32" alt="" />
            substition<span className="brand-period">.</span>
          </a>
          <div className="lock-card">
            <span className="lock-emblem">
              <Fingerprint size={48} weight="light" />
            </span>
            <p className="eyebrow">ONLY YOU HOLD THE KEY</p>
            <h1>
              Welcome back
              <br />
              to your quiet corner.
            </h1>
            <p>
              Your subscriptions are encrypted on this device.
              <br />
              Unlock your vault to pick up where you left off.
            </p>
            <form onSubmit={(e) => void openVault(e)}>
              <label>
                Vault passphrase
                <input
                  name="passphrase"
                  type="password"
                  minLength={10}
                  maxLength={256}
                  required
                  autoComplete="current-password"
                />
              </label>
              {vaultError && (
                <p className="form-error" role="alert">
                  {vaultError}
                </p>
              )}
              <button className="button primary full" disabled={vaultBusy}>
                {vaultBusy ? "Unlocking…" : "Unlock my workspace"}
                <ArrowRight size={18} />
              </button>
            </form>
            <p className="small muted">No reset link. Your passphrase never reaches a server.</p>
            <details>
              <summary>Lost your passphrase?</summary>
              <p className="small">
                We cannot recover an encrypted vault. Keep an encrypted backup and its passphrase.
                Deleting site storage removes the vault permanently. A backup remains encrypted.
              </p>
            </details>
          </div>
          <a className="text-button" href="/privacy">
            Read our privacy promise
            <ArrowSquareOut size={15} />
          </a>
        </main>
      </>
    );

  return (
    <>
      <Ambient playful={playful} />
      <NativeSupport onInstallReady={updateInstall} />
      <header className="app-header">
        <div className="header-inner">
          <button
            className="wordmark"
            aria-label="Substition home"
            onClick={() => {
              navigate("overview");
              brandClicks.current++;
              if (brandClicks.current % 5 === 0) {
                setPlayful((p) => !p);
                notify(
                  "A small reminder: the best things in life don’t auto-renew. Take a breath.",
                );
              }
            }}
          >
            <img src="/brand/mark.svg" width="33" height="33" alt="" />
            substition<span className="brand-period">.</span>
          </button>
          <nav className="desktop-nav" aria-label="Main navigation">
            {views.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={view === id ? "active" : ""}
                aria-current={view === id ? "page" : undefined}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <button className="privacy-pill" onClick={() => setPanel("settings")}>
              <ShieldCheck size={17} weight="duotone" />
              <span>{mode === "demo" ? "Private by design" : "Local vault"}</span>
            </button>
            <button
              className="icon-button theme-toggle"
              aria-label={`Switch to ${resolvedTheme === "light" ? "dark" : "light"} theme`}
              onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
            >
              {resolvedTheme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              className="avatar-button"
              onClick={() => setPanel("settings")}
              aria-label="Open workspace and privacy settings"
            >
              <UserCircle size={34} weight="duotone" />
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="main-shell">
        {mode === "demo" && (
          <div className="demo-banner">
            <span>
              <span className="tiny-dot" /> A little look around. You’re exploring a demo workspace.
            </span>
            <button
              onClick={() => {
                setPanel("create");
                setVaultError("");
              }}
            >
              Make it yours
              <ArrowRight size={14} />
            </button>
          </div>
        )}
        {storageError && (
          <div className="error-banner" role="alert">
            {storageError}
            <button className="text-button" onClick={() => void backup()}>
              Export backup
            </button>
          </div>
        )}
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {view === "overview"
                ? "YOUR EVERYDAY, A LITTLE LIGHTER"
                : view === "subscriptions"
                  ? "ALL YOUR RECURRING THINGS"
                  : view === "calendar"
                    ? "AHEAD OF THE AUTO-RENEW"
                    : "SMALL CHANGES. MORE POSSIBILITY."}
            </p>
            <h1>
              {view === "overview" ? (
                <>
                  A little clarity. <span>A lot more control.</span>
                </>
              ) : view === "subscriptions" ? (
                <>
                  Your subscriptions
                  <span className="heading-count">{workspace.subscriptions.length}</span>
                </>
              ) : view === "calendar" ? (
                <>
                  Goodbye, <span>surprise renewals.</span>
                </>
              ) : (
                <>
                  Make room <span>for what matters.</span>
                </>
              )}
            </h1>
            <p className="heading-description">
              {view === "overview"
                ? "Everything you subscribe to. One calm place to keep it in check."
                : view === "subscriptions"
                  ? "The ones you love, the ones you forgot. All together."
                  : view === "calendar"
                    ? "A little heads-up for everything coming your way."
                    : "Thoughtful ways to spend less, without missing out."}
            </p>
          </div>
          <div className="page-actions">
            <button className="button secondary import-button" onClick={() => setPanel("import")}>
              <UploadSimple size={17} /> Import statement
            </button>
            <button
              className="button primary"
              onClick={() => {
                setPanel("add");
                setEditing(false);
              }}
            >
              <Plus size={18} /> Add subscription
            </button>
          </div>
        </div>

        {view === "overview" && (
          <>
            <section className="hero-grid" aria-label="Your subscription overview">
              <div className="spend-card">
                <div className="spend-copy">
                  <span className="card-kicker">
                    <span className="live-dot" /> YOUR MONTHLY SPEND
                  </span>
                  <div className="hero-amount">
                    {money(monthly, workspace.currency)}
                    <span>/ mo</span>
                  </div>
                  <p>
                    A little here. A little there.
                    <br />
                    Now you can see the whole picture.
                  </p>
                  <div className="hero-chips">
                    <span>
                      {live.filter((s) => s.currency === workspace.currency).length} active
                      subscriptions
                    </span>
                    <button onClick={() => setPanel("budget")}>
                      {workspace.currency}
                      <CaretDown size={12} />
                    </button>
                  </div>
                  {Object.keys(allTotals).length > 1 && (
                    <p className="multi-currency-note">
                      Other currencies shown separately in Insights.
                    </p>
                  )}
                </div>
                <button
                  className={`hero-art ${playful ? "playful" : ""}`}
                  aria-label="Play with your renewal loop illustration"
                  onClick={() => setPlayful((p) => !p)}
                  onPointerMove={(e) => {
                    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty(
                      "--rx",
                      `${(e.clientY - r.top - r.height / 2) / 22}deg`,
                    );
                    e.currentTarget.style.setProperty(
                      "--ry",
                      `${(e.clientX - r.left - r.width / 2) / 18}deg`,
                    );
                  }}
                  onPointerLeave={(e) => {
                    e.currentTarget.style.setProperty("--rx", "0deg");
                    e.currentTarget.style.setProperty("--ry", "0deg");
                  }}
                >
                  <img
                    src="/images/renewal-loop.webp"
                    width="960"
                    height="960"
                    alt="A glossy jade renewal loop, a silver orbit and a small peach sphere"
                    fetchPriority="high"
                  />
                  <span className="art-label">
                    <Leaf size={12} weight="fill" /> A little more breathing room.
                  </span>
                </button>
              </div>
              <div className="breathing-card">
                <div className="breathing-top">
                  <span className="icon-tile">
                    <Sparkle size={23} weight="duotone" />
                  </span>
                  <span className="soft-badge">A FRESH PERSPECTIVE</span>
                </div>
                <h2>
                  Less on repeat.
                  <br />
                  More for you.
                </h2>
                <p>
                  {potential > 0 ? (
                    <>
                      You have {entertainment.length} entertainment subscriptions. A quick review
                      could free up <strong>{money(potential, workspace.currency)}/mo.</strong>
                    </>
                  ) : (
                    "Keep the subscriptions that earn their place. Let the rest go, thoughtfully."
                  )}
                </p>
                <button onClick={() => navigate("insights")} className="round-link">
                  <span>Find a little breathing room</span>
                  <span>
                    <ArrowRight size={20} />
                  </span>
                </button>
              </div>
            </section>
            <section className="quick-stats" aria-label="At a glance">
              <button onClick={() => navigate("calendar")}>
                <span className="stat-icon blue">
                  <CalendarBlank size={21} weight="duotone" />
                </span>
                <span>
                  <small>Coming up in 7 days</small>
                  <strong>
                    {coming.filter((x) => daysUntil(x.date) <= 7).length} renewals
                    <span>
                      <ArrowUpRightSmall />
                    </span>
                  </strong>
                </span>
              </button>
              <button
                onClick={() => {
                  setFilter("trial");
                  setCategory("All");
                  setView("subscriptions");
                }}
              >
                <span className="stat-icon peach">
                  <Bell size={21} weight="duotone" />
                </span>
                <span>
                  <small>Worth a little attention</small>
                  <strong>
                    {trials.length} {trials.length === 1 ? "trial to review" : "trials to review"}
                    <span>
                      <ArrowUpRightSmall />
                    </span>
                  </strong>
                </span>
              </button>
              <button onClick={() => setPanel("budget")}>
                <span className="stat-icon mint">
                  <Wallet size={21} weight="duotone" />
                </span>
                <span>
                  <small>Your monthly breathing room</small>
                  <strong>
                    {money(Math.max(0, workspace.budgetMinor - monthly), workspace.currency)}
                    <span className="stat-detail">
                      {" "}
                      of {money(workspace.budgetMinor, workspace.currency, true)}
                    </span>
                  </strong>
                </span>
              </button>
            </section>
            <div className="content-columns">
              <section className="subscriptions-section">
                <div className="section-heading">
                  <div>
                    <h2>
                      Your subscriptions <span className="count-badge">{live.length}</span>
                    </h2>
                    <p>A place for every recurring thing.</p>
                  </div>
                  <button className="text-button" onClick={() => navigate("subscriptions")}>
                    View all
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="list-toolbar">
                  <div className="segmented">
                    <button
                      className={filter === "active" ? "active" : ""}
                      onClick={() => setFilter("active")}
                    >
                      Active
                    </button>
                    <button
                      className={filter === "trial" ? "active" : ""}
                      onClick={() => setFilter("trial")}
                    >
                      Free trials{trials.length > 0 && <span>{trials.length}</span>}
                    </button>
                    <button
                      className={filter === "all" ? "active" : ""}
                      onClick={() => setFilter("all")}
                    >
                      All
                    </button>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Search all subscriptions"
                    onClick={() => navigate("subscriptions")}
                  >
                    <MagnifyingGlass size={20} />
                  </button>
                </div>
                {table(5)}
                <button className="list-footer" onClick={() => setPanel("add")}>
                  <Plus size={17} /> Something missing? Add a subscription
                </button>
              </section>
              <aside className="upcoming-section">
                <div className="section-heading">
                  <div>
                    <h2>Just around the corner</h2>
                    <p>Your next little heads-ups.</p>
                  </div>
                  <CalendarBlank size={21} />
                </div>
                <div className="upcoming-list">
                  {coming.slice(0, 4).map(({ sub, date }, i) => (
                    <button key={`${sub.id}-${date}`} onClick={() => setSelected(sub)}>
                      <span className="date-tile">
                        <small>{dateLabel(date, { month: "short" })}</small>
                        <strong>{parseDate(date).getDate()}</strong>
                      </span>
                      <span className="upcoming-info">
                        <strong>{sub.name}</strong>
                        <small>
                          {sub.status === "trial" ? (
                            <span className="trial-text">Trial ending</span>
                          ) : i === 0 ? (
                            "Next up"
                          ) : (
                            "Auto-renewal"
                          )}
                        </small>
                      </span>
                      <span className="upcoming-amount">
                        {money(sub.amountMinor, sub.currency)}
                      </span>
                    </button>
                  ))}
                  {!coming.length && (
                    <p className="muted">Nothing due in the next 30 days. Enjoy the quiet.</p>
                  )}
                </div>
                <button
                  className="text-button upcoming-calendar"
                  onClick={() => navigate("calendar")}
                >
                  See your calendar
                  <ArrowRight size={16} />
                </button>
                <div className="privacy-card">
                  <ShieldCheck size={29} weight="duotone" />
                  <h3>Your life. Your data.</h3>
                  <p>
                    {mode === "private"
                      ? "Encrypted on this device. No bank access. No one looking over your shoulder."
                      : "No bank connection. No data brokers. A private vault when you’re ready."}
                  </p>
                  <button className="text-button" onClick={() => setPanel("settings")}>
                    Meet your privacy controls
                    <ArrowRight size={14} />
                  </button>
                </div>
              </aside>
            </div>
          </>
        )}

        {view === "subscriptions" && (
          <section className="full-list-section">
            <div className="search-toolbar">
              <label className="search-field">
                <MagnifyingGlass size={20} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a subscription…"
                  aria-label="Search subscriptions"
                />
                {query && (
                  <button
                    className="icon-button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={16} />
                  </button>
                )}
              </label>
              <label className="filter-select">
                <SlidersHorizontal size={18} />
                <select
                  aria-label="Filter by category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="All">All categories</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <select
                aria-label="Filter by status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="status-select"
              >
                <option value="active">Active & trials</option>
                <option value="trial">Free trials</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
                <option value="all">All statuses</option>
              </select>
            </div>
            {table()}
            <div className="list-bottom">
              <span>{filtered.length} subscriptions · every currency kept separate</span>
              <button
                className="text-button"
                onClick={() => {
                  downloadFile(
                    "substition-subscriptions.csv",
                    exportCSV(workspace.subscriptions),
                    "text/csv",
                  );
                  notify("CSV exported. This file contains unencrypted subscription details.");
                }}
              >
                <DownloadSimple size={16} /> Export CSV
              </button>
            </div>
          </section>
        )}

        {view === "calendar" && (
          <CalendarView
            subscriptions={workspace.subscriptions}
            onSelect={setSelected}
            onExport={() => {
              downloadFile(
                "substition-renewals.ics",
                calendarICS(workspace.subscriptions),
                "text/calendar",
              );
              notify("Calendar exported with one-day reminders. Import it into your calendar app.");
            }}
          />
        )}

        {view === "insights" && (
          <div className="insights-view">
            <section className="insight-summary">
              <div>
                <p className="eyebrow">THE BIGGER PICTURE</p>
                <h2>
                  {money(monthly * 12, workspace.currency)}
                  <span>/ year</span>
                </h2>
                <p>
                  Your current recurring spend, annualised.
                  <br />
                  Small payments have a bigger story.
                </p>
              </div>
              <div className="yearly-callout">
                <TrendDown size={32} weight="duotone" />
                <span>
                  {live.length} active subscriptions
                  <br />
                  <strong>{overlapGroups.length} categories worth reviewing</strong>
                </span>
              </div>
            </section>
            <div className="insights-grid">
              <section className="insight-card">
                <div className="section-heading">
                  <h2>Where the little things go</h2>
                  <span className="soft-badge">{workspace.currency}</span>
                </div>
                <div className="category-breakdown">
                  {categories.map((c, i) => {
                    const amount = live
                      .filter((s) => s.category === c && s.currency === workspace.currency)
                      .reduce((n, s) => n + monthlyMinor(s), 0);
                    return (
                      <div key={c}>
                        <div>
                          <span>
                            <i className={`category-dot cat-${i}`} />
                            {c}
                          </span>
                          <strong>{money(amount, workspace.currency)}</strong>
                        </div>
                        <progress
                          className={`cat-${i}`}
                          value={amount}
                          max={Math.max(monthly, 1)}
                          aria-label={`${c} spend`}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="small muted">
                  Monthly estimates. Weekly billing uses 52 weeks/year. This is a forecast, not
                  bank-verified spending.
                </p>
              </section>
              <section className="insight-card overlap-card">
                <span className="icon-tile">
                  <Sparkle size={24} weight="duotone" />
                </span>
                <h2>
                  Same space.
                  <br />
                  Different subscriptions.
                </h2>
                <p>Overlap isn’t always waste. Keep what you use, and review what you don’t.</p>
                {overlapGroups.length ? (
                  overlapGroups.map((g) => (
                    <div className="overlap-group" key={g.category}>
                      <div className="overlap-logos">
                        {g.subs.slice(0, 4).map((s) => (
                          <MerchantLogo key={s.id} providerId={s.providerId} size="small" />
                        ))}
                      </div>
                      <div>
                        <strong>{g.category}</strong>
                        <small>{g.subs.length} subscriptions</small>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Review ${g.category}`}
                        onClick={() => {
                          setCategory(g.category);
                          setFilter("active");
                          setView("subscriptions");
                        }}
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="notice">
                    No overlapping categories yet. That’s a little less to think about.
                  </p>
                )}
              </section>
              <section className="insight-card">
                <h2>Every currency, its own story.</h2>
                <p>We never add different currencies together or quietly guess an exchange rate.</p>
                <div className="currency-totals">
                  {Object.entries(allTotals).map(([currency, total]) => (
                    <div key={currency}>
                      <span>{currency}</span>
                      <strong>
                        {money(total, currency)}
                        <small>/ mo</small>
                      </strong>
                      <span>{money(total * 12, currency)} / year</span>
                    </div>
                  ))}
                  {!Object.keys(allTotals).length && (
                    <p className="muted">Your totals will appear here.</p>
                  )}
                </div>
              </section>
              <section className="insight-card assistant-card">
                <ChatIllustration />
                <p className="eyebrow">THOUGHTFUL BY NATURE. LOCAL BY DESIGN.</p>
                <h2>
                  A little help.
                  <br />
                  No cloud required.
                </h2>
                <p>
                  Download a small on-device model and talk through your subscriptions. Your
                  questions stay with you.
                </p>
                <button className="button primary" onClick={() => setPanel("assistant")}>
                  Meet your offline assistant
                  <ArrowRight size={17} />
                </button>
              </section>
            </div>
            <div className="honest-note">
              <Info size={18} />
              <p>
                Insights come from your records. We don’t track app usage or claim a subscription is
                unused. Alternative prices and automated email discovery are planned, not connected
                in this release.
              </p>
            </div>
          </div>
        )}

        <section className="bottom-note">
          <span>
            <LockKey size={14} />{" "}
            {mode === "demo"
              ? "A private place for your recurring things."
              : saveStatus === "saving"
                ? "Encrypting and saving…"
                : saveStatus === "error"
                  ? "Save needs attention"
                  : "Encrypted & saved on this device."}
          </span>
          <button onClick={() => setPanel("assistant")}>
            <Sparkle size={15} /> A little help?
          </button>
        </section>
        <footer className="app-footer">
          <span>Less recurring. More living.</span>
          <div>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <button onClick={() => setPanel("install")}>
              Get the app
              <ArrowSquareOut size={12} />
            </button>
          </div>
          <span className="footer-brand">Made for a little more peace of mind.</span>
        </footer>
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {views.map(({ id, label, icon: Icon }) => (
          <button
            className={view === id ? "active" : ""}
            key={id}
            aria-current={view === id ? "page" : undefined}
            onClick={() => navigate(id)}
          >
            <Icon size={21} weight={view === id ? "fill" : "regular"} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle size={20} weight="fill" />
          <span>{toast}</span>
          {undo && (
            <button
              onClick={() => {
                setWorkspace((w) => ({ ...w, subscriptions: [...w.subscriptions, undo] }));
                setUndo(null);
                setToast("Subscription restored.");
              }}
            >
              Undo
            </button>
          )}
          <button
            aria-label="Dismiss message"
            onClick={() => {
              setToast("");
              setUndo(null);
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {panel === "add" && (
        <Dialog
          title="Make a little room for it."
          subtitle="One more recurring thing, beautifully in order."
          onClose={() => setPanel(null)}
        >
          <SubscriptionForm defaultCurrency={workspace.currency} onSave={save} />
        </Dialog>
      )}
      {selected && (
        <Dialog
          title={editing ? "A little adjustment." : selected.name}
          subtitle={editing ? "Keep the details up to date." : selected.plan}
          onClose={() => {
            setSelected(null);
            setEditing(false);
          }}
        >
          {editing ? (
            <SubscriptionForm
              initial={selected}
              defaultCurrency={workspace.currency}
              onSave={save}
            />
          ) : (
            <SubscriptionDetail
              subscription={selected}
              onEdit={() => setEditing(true)}
              onRemove={() => remove(selected)}
              onCancel={(note) => {
                setWorkspace((w) => ({
                  ...w,
                  subscriptions: w.subscriptions.map((s) =>
                    s.id === selected.id
                      ? { ...s, status: "cancelled", cancellationNote: note }
                      : s,
                  ),
                }));
                setSelected(null);
                notify("Marked as cancelled in your tracker. Keep your provider’s confirmation.");
              }}
            />
          )}
        </Dialog>
      )}
      {panel === "import" && (
        <Dialog
          title="Find your recurring things."
          subtitle="A private little subscription audit."
          onClose={() => setPanel(null)}
        >
          <ImportPanel
            currency={workspace.currency}
            existing={workspace.subscriptions}
            onImport={(subs) => {
              if (workspace.subscriptions.length + subs.length > 2000) {
                notify("Import fewer entries. A workspace supports up to 2,000 subscriptions.");
                return;
              }
              setWorkspace((w) => ({ ...w, subscriptions: [...w.subscriptions, ...subs] }));
              setPanel(null);
              notify(`${subs.length} reviewed subscriptions added. Your statement was not stored.`);
            }}
          />
        </Dialog>
      )}
      {panel === "assistant" && (
        <Dialog
          title="A little help, locally."
          subtitle="Your optional on-device subscription assistant."
          wide
          onClose={() => setPanel(null)}
        >
          <OfflineAssistant subscriptions={workspace.subscriptions} />
        </Dialog>
      )}
      {panel === "create" && (
        <Dialog
          title="Your own quiet corner."
          subtitle="No account. No bank connection. Just you."
          onClose={() => setPanel(null)}
        >
          <div className="privacy-note">
            <LockKey size={24} weight="duotone" />
            <span>
              A vault only you can open.
              <small>Encrypted with your passphrase before saving on this device.</small>
            </span>
          </div>
          <p className="muted">
            Start with an empty workspace. Keep a copy of your passphrase and export backups
            regularly. We cannot recover a lost passphrase.
          </p>
          <form className="subscription-form" onSubmit={(e) => void openVault(e, true)}>
            <label>
              Create a vault passphrase
              <input
                name="passphrase"
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={256}
                required
                placeholder="At least 10 characters"
              />
            </label>
            <label className="checkbox-line">
              <input type="checkbox" required />
              <span>
                I understand that clearing browser storage removes this vault, and I need backups
                and my passphrase to restore it.
              </span>
            </label>
            {vaultError && (
              <p className="form-error" role="alert">
                {vaultError}
              </p>
            )}
            <button className="button primary full" disabled={vaultBusy}>
              {vaultBusy ? "Creating your vault…" : "Create my private workspace"}
              <ArrowRight size={18} />
            </button>
          </form>
        </Dialog>
      )}
      {panel === "settings" && (
        <Dialog
          title="Your space. Your rules."
          subtitle="A little control over the important things."
          onClose={() => setPanel(null)}
        >
          <SettingsContent
            mode={mode}
            theme={theme}
            setTheme={setTheme}
            onCreate={() => {
              setVaultError("");
              setPanel("create");
            }}
            onBackup={() => void backup()}
            onCSV={() => {
              downloadFile(
                "substition-subscriptions.csv",
                exportCSV(workspace.subscriptions),
                "text/csv",
              );
              notify("Unencrypted CSV exported. Store it carefully.");
            }}
            onRestore={async (file, password) => {
              if (file.size > 8e6) throw new Error("Choose a backup smaller than 8 MB.");
              const saved = validateEnvelope(JSON.parse(await file.text()));
              const result = await unlockWorkspace(saved, password);
              await saveQueue.current;
              await writeVault(saved);
              keyRef.current = result.key;
              saltRef.current = result.salt;
              setEnvelope(saved);
              setWorkspace(result.workspace);
              setMode("private");
              notify("Your encrypted backup is restored on this device.");
            }}
            onLock={() => void lock()}
            onErase={() => setPanel("erase")}
            onInstall={() => setPanel("install")}
            onAssistant={() => setPanel("assistant")}
          />
        </Dialog>
      )}
      {panel === "budget" && (
        <Dialog
          title="Leave yourself some breathing room."
          subtitle="A personal monthly target, in your own currency."
          onClose={() => setPanel(null)}
        >
          <form
            className="subscription-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              try {
                const currency = String(data.get("currency"));
                setWorkspace((w) => ({
                  ...w,
                  currency,
                  budgetMinor: toMinor(String(data.get("budget")), currency),
                }));
                setPanel(null);
                notify("Monthly target updated. Currencies are never automatically converted.");
              } catch (e) {
                notify(e instanceof Error ? e.message : "Check the amount.");
              }
            }}
          >
            <label>
              Display currency
              <select name="currency" defaultValue={workspace.currency}>
                {supportedCurrencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Monthly target
              <input
                name="budget"
                inputMode="decimal"
                required
                defaultValue={(
                  workspace.budgetMinor /
                  10 ** currencyDigits(workspace.currency)
                ).toFixed(currencyDigits(workspace.currency))}
              />
            </label>
            <p className="small muted">
              Changing currency changes the target’s unit; it does not convert your existing
              amounts. Other currencies remain separate.
            </p>
            <button className="button primary">
              Save my target
              <Check size={18} />
            </button>
          </form>
        </Dialog>
      )}
      {panel === "erase" && (
        <Dialog
          title="A completely fresh start."
          subtitle="This permanently deletes the saved vault on this device."
          onClose={() => setPanel("settings")}
        >
          <p>
            Export an encrypted backup first if you might want to return. Deleting your local vault
            does not cancel subscriptions or delete optional sign-in accounts.
          </p>
          <button className="text-button" onClick={() => void backup()}>
            Export encrypted backup
            <DownloadSimple size={16} />
          </button>
          <form
            className="subscription-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              if (data.get("confirm") !== "DELETE") return;
              try {
                await saveQueue.current;
                await writeVault(null);
                keyRef.current = null;
                saltRef.current = null;
                setEnvelope(null);
                setWorkspace(demoWorkspace());
                setMode("demo");
                setPanel(null);
                notify(
                  "Local vault deleted. Downloaded AI models can be removed in the assistant.",
                );
              } catch {
                notify(
                  "Could not delete the local vault. Try again or clear this site's storage in your browser.",
                );
              }
            }}
          >
            <label>
              Type DELETE to confirm
              <input
                name="confirm"
                pattern="DELETE"
                required
                autoComplete="off"
                placeholder="DELETE"
              />
            </label>
            <button className="button destructive">
              Delete local vault
              <Trash size={18} />
            </button>
          </form>
        </Dialog>
      )}
      {panel === "install" && (
        <Dialog
          title="A calmer home screen."
          subtitle="Keep Substition a tap away."
          onClose={() => setPanel(null)}
        >
          <div className="install-art">
            <img src="/brand/icon-192.png" width="86" height="86" alt="Substition app icon" />
          </div>
          <h3>Your subscriptions, pocket-sized.</h3>
          <p>
            Install the web app for a standalone window, home screen access and offline tracking
            after your first complete visit.
          </p>
          {installAction ? (
            <button className="button primary full" onClick={installAction}>
              <DownloadSimple size={18} /> Install Substition
            </button>
          ) : (
            <div className="instruction-box">
              <strong>On iPhone or iPad</strong>
              <p>Open in Safari. Tap Share, then Add to Home Screen and Open as Web App.</p>
              <strong>On Android or desktop</strong>
              <p>
                Use your browser’s Install app or Add to Home screen menu. Availability depends on
                the browser.
              </p>
            </div>
          )}
          <p className="small muted">
            Offline models need one separate download. Background renewal reminders use your
            calendar app; web apps cannot reliably schedule local alarms on every device.
          </p>
          <button
            className="text-button"
            onClick={() => {
              downloadFile(
                "substition-renewals.ics",
                calendarICS(workspace.subscriptions),
                "text/calendar",
              );
            }}
          >
            Export renewal reminders
            <CalendarBlank size={16} />
          </button>
        </Dialog>
      )}
    </>
  );
}

function ArrowUpRightSmall() {
  return <ArrowRight size={17} style={{ transform: "rotate(-40deg)" }} />;
}
function ChatIllustration() {
  return (
    <span className="assistant-emblem">
      <Sparkle size={34} weight="duotone" />
    </span>
  );
}

function SubscriptionDetail({
  subscription: sub,
  onEdit,
  onRemove,
  onCancel,
}: {
  subscription: Subscription;
  onEdit: () => void;
  onRemove: () => void;
  onCancel: (note: string) => void;
}) {
  const route = cancellationRoute(sub.providerId, sub.platform),
    [confirm, setConfirm] = useState(false),
    [removeConfirm, setRemoveConfirm] = useState(false);
  return (
    <div className="subscription-detail">
      <div className="detail-summary">
        <MerchantLogo providerId={sub.providerId} size="large" />
        <div>
          <h3>
            {money(sub.amountMinor, sub.currency)}
            <span>
              {" "}
              /{" "}
              {sub.interval === "annual"
                ? "year"
                : sub.interval === "quarterly"
                  ? "quarter"
                  : sub.interval === "weekly"
                    ? "week"
                    : "month"}
            </span>
          </h3>
          <span className={`status-badge ${sub.status}`}>{sub.status}</span>
        </div>
        <button className="button secondary" onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className="detail-facts">
        <div>
          <span>Next charge / trial end</span>
          <strong>{dateLabel(nextOccurrence(sub), { dateStyle: "medium" })}</strong>
        </div>
        <div>
          <span>Yearly estimate</span>
          <strong>{money(monthlyMinor(sub) * 12, sub.currency)}</strong>
        </div>
        <div>
          <span>Category</span>
          <strong>{sub.category}</strong>
        </div>
        <div>
          <span>Billed through</span>
          <strong>
            {
              {
                direct: "Provider",
                apple: "Apple App Store",
                google: "Google Play",
                paypal: "PayPal",
                stripe: "Merchant via Stripe",
              }[sub.platform]
            }
          </strong>
        </div>
      </div>
      {sub.notes && <p className="detail-notes">{sub.notes}</p>}
      {sub.cancellationNote && (
        <div className="notice">
          <CheckCircle size={19} />
          <span>Your cancellation note: {sub.cancellationNote}</span>
        </div>
      )}
      <div className="cancellation-guide">
        <div className="section-heading">
          <h3>A clear way out.</h3>
          <span className="soft-badge">GUIDED CANCELLATION</span>
        </div>
        <p>{route.note}</p>
        <ol>
          {route.steps.map((step, i) => (
            <li key={step}>
              <span>{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        {route.url && (
          <a
            className="button primary full"
            target="_blank"
            rel="noopener noreferrer"
            href={route.url}
          >
            {route.title}
            <ArrowSquareOut size={17} />
          </a>
        )}
        <p className="small muted">
          Opens your provider’s official page. Steps can change by region or plan. Any fee, refund
          or access end date must be confirmed with the provider.
        </p>
        {sub.status !== "cancelled" && (
          <button className="button secondary full" onClick={() => setConfirm((p) => !p)}>
            I’ve cancelled with my provider
            <Check size={18} />
          </button>
        )}
        {confirm && (
          <form
            className="subscription-form cancel-confirm"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              onCancel(String(data.get("note")));
            }}
          >
            <label>
              Confirmation or effective date
              <textarea
                name="note"
                rows={2}
                maxLength={1000}
                required
                placeholder="e.g. Access ends 30 November; confirmation saved in my email."
              />
            </label>
            <label className="checkbox-line">
              <input type="checkbox" required />
              <span>I completed cancellation with the provider. This only updates my tracker.</span>
            </label>
            <button className="button primary full">
              Mark as cancelled
              <CheckCircle size={18} />
            </button>
          </form>
        )}
      </div>
      <button className="text-button danger" onClick={() => setRemoveConfirm(true)}>
        <Trash size={16} /> Remove from tracker
      </button>
      {removeConfirm && (
        <div className="notice remove-notice">
          <p>Removing this entry does not cancel the service.</p>
          <button className="button destructive" onClick={onRemove}>
            Remove entry
          </button>
          <button className="text-button" onClick={() => setRemoveConfirm(false)}>
            Keep it
          </button>
        </div>
      )}
    </div>
  );
}

function CalendarView({
  subscriptions,
  onSelect,
  onExport,
}: {
  subscriptions: Subscription[];
  onSelect: (sub: Subscription) => void;
  onExport: () => void;
}) {
  const [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [day, setDay] = useState<string | null>(null),
    touch = useRef(0);
  const from = localISO(month),
    end = localISO(new Date(month.getFullYear(), month.getMonth() + 1, 0)),
    padding = month.getDay(),
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const entries = subscriptions
    .filter(isLive)
    .flatMap((sub) => occurrences(sub, from, end).map((date) => ({ date, sub })))
    .sort((a, b) => a.date.localeCompare(b.date));
  const move = (direction: number) => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + direction, 1));
    setDay(null);
  };
  return (
    <div className="calendar-layout">
      <section
        className="calendar-card"
        onTouchStart={(e) => {
          touch.current = e.changedTouches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const diff = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(diff) > 80) move(diff < 0 ? 1 : -1);
        }}
      >
        <div className="calendar-heading">
          <div>
            <h2>
              {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}
            </h2>
            <p>{entries.length} renewals in view</p>
          </div>
          <div>
            <button
              className="text-button"
              onClick={() => {
                setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                setDay(todayISO());
              }}
            >
              Today
            </button>
            <button className="icon-button" aria-label="Previous month" onClick={() => move(-1)}>
              <CaretLeft size={20} />
            </button>
            <button className="icon-button" aria-label="Next month" onClick={() => move(1)}>
              <CaretRight size={20} />
            </button>
          </div>
        </div>
        <div className="calendar-grid" role="group" aria-label="Renewal calendar">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div className="weekday" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: padding }, (_, i) => (
            <div key={`blank-${i}`} className="calendar-blank" />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = localISO(new Date(month.getFullYear(), month.getMonth(), i + 1)),
              charges = entries.filter((e) => e.date === date);
            return (
              <button
                key={date}
                className={`calendar-day ${date === todayISO() ? "today" : ""} ${day === date ? "selected" : ""}`}
                aria-label={`${dateLabel(date, { dateStyle: "full" })}, ${charges.length} renewals`}
                aria-pressed={day === date}
                onClick={() => setDay(day === date ? null : date)}
              >
                <span>{i + 1}</span>
                <div className="calendar-logos">
                  {charges.slice(0, 2).map(({ sub }) => (
                    <MerchantLogo key={sub.id} providerId={sub.providerId} size="tiny" />
                  ))}
                  {charges.length > 2 && <small>+{charges.length - 2}</small>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="calendar-footnote">
          <span>
            <span className="status-dot" /> Today
          </span>
          <span>Tap a date for a little more detail.</span>
        </div>
      </section>
      <aside className="calendar-agenda">
        <div className="section-heading">
          <h2>{day ? dateLabel(day, { month: "short", day: "numeric" }) : "This month"}</h2>
          {day && (
            <button className="text-button" onClick={() => setDay(null)}>
              Show all
            </button>
          )}
        </div>
        <div className="upcoming-list">
          {entries
            .filter((e) => !day || e.date === day)
            .map(({ sub, date }) => (
              <button key={`${sub.id}-${date}`} onClick={() => onSelect(sub)}>
                <MerchantLogo providerId={sub.providerId} />
                <span className="upcoming-info">
                  <strong>{sub.name}</strong>
                  <small>
                    {dateLabel(date)}
                    {sub.status === "trial" ? " · trial ends" : ""}
                  </small>
                </span>
                <strong className="upcoming-amount">{money(sub.amountMinor, sub.currency)}</strong>
              </button>
            ))}
          {!entries.some((e) => !day || e.date === day) && (
            <div className="empty-state">
              <Leaf size={30} />
              <p>
                No renewals here.
                <br />A little space to breathe.
              </p>
            </div>
          )}
        </div>
        <button className="button secondary full" onClick={onExport}>
          <DownloadSimple size={18} /> Export calendar & reminders
        </button>
        <p className="small muted">
          12 months of calendar events, with one-day reminders. Export again after making changes.
          Background alerts are handled by your calendar app.
        </p>
      </aside>
    </div>
  );
}

function SettingsContent({
  mode,
  theme,
  setTheme,
  onCreate,
  onBackup,
  onCSV,
  onRestore,
  onLock,
  onErase,
  onInstall,
  onAssistant,
}: {
  mode: string;
  theme: string;
  setTheme: (theme: string) => void;
  onCreate: () => void;
  onBackup: () => void;
  onCSV: () => void;
  onRestore: (file: File, password: string) => Promise<void>;
  onLock: () => void;
  onErase: () => void;
  onInstall: () => void;
  onAssistant: () => void;
}) {
  const [restore, setRestore] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="settings-content">
      <div className="privacy-note">
        <ShieldCheck size={28} weight="duotone" />
        <span>
          {mode === "demo" ? "You’re exploring a demo." : "Encrypted. On this device. Yours."}
          <small>
            {mode === "demo"
              ? "No personal vault has been created."
              : "AES-GCM encryption. Your passphrase is not stored."}
          </small>
        </span>
      </div>
      <section>
        <h3>Make yourself at home</h3>
        <p className="small muted">Let the app follow your device, or set your own mood.</p>
        <div className="theme-picker">
          {[
            { value: "light", icon: Sun },
            { value: "dark", icon: Moon },
            { value: "system", icon: SlidersHorizontal },
          ].map(({ value, icon: Icon }) => (
            <button
              key={value}
              aria-pressed={theme === value}
              className={theme === value ? "selected" : ""}
              onClick={() => setTheme(value)}
            >
              <Icon size={21} />
              <span>{value[0].toUpperCase() + value.slice(1)}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>Your private workspace</h3>
        {mode === "demo" ? (
          <button className="settings-row" onClick={onCreate}>
            <LockKey size={20} />
            <span>
              Create my encrypted vault<small>Start fresh with your own passphrase</small>
            </span>
            <ArrowRight size={17} />
          </button>
        ) : (
          <>
            <button className="settings-row" onClick={onBackup}>
              <DownloadSimple size={20} />
              <span>
                Export encrypted backup<small>Keep your passphrase safe to restore it</small>
              </span>
              <ArrowRight size={17} />
            </button>
            <button className="settings-row" onClick={onCSV}>
              <ListBullets size={20} />
              <span>
                Export subscriptions as CSV<small>Unencrypted; handle this file with care</small>
              </span>
              <ArrowRight size={17} />
            </button>
            <button className="settings-row" onClick={onLock}>
              <Fingerprint size={20} />
              <span>
                Lock my vault<small>Also locks after 5 minutes in a hidden tab</small>
              </span>
              <ArrowRight size={17} />
            </button>
          </>
        )}
        <button className="settings-row" onClick={() => setRestore((p) => !p)}>
          <UploadSimple size={20} />
          <span>
            Restore an encrypted backup<small>Replaces the saved workspace on this device</small>
          </span>
          <ArrowRight size={17} />
        </button>
        {restore && (
          <form
            className="subscription-form restore-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!file) return;
              const password = String(new FormData(e.currentTarget).get("passphrase"));
              setBusy(true);
              setError("");
              try {
                await onRestore(file, password);
                setRestore(false);
                setFile(null);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not restore backup.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Encrypted backup
              <input
                type="file"
                accept=".json"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              Backup passphrase
              <input type="password" name="passphrase" required minLength={10} autoComplete="off" />
            </label>
            <label className="checkbox-line">
              <input type="checkbox" required />
              <span>I exported any data I need to keep. This replaces the local vault.</span>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Restoring…" : "Restore backup"}
            </button>
          </form>
        )}
      </section>
      <section>
        <h3>A little more native</h3>
        <button className="settings-row" onClick={onInstall}>
          <DownloadSimple size={20} />
          <span>
            Install the app<small>Home screen access & offline workspace</small>
          </span>
          <ArrowRight size={17} />
        </button>
        <button className="settings-row" onClick={onAssistant}>
          <Sparkle size={20} />
          <span>
            Optional offline assistant<small>Download a model. Keep conversations local.</small>
          </span>
          <ArrowRight size={17} />
        </button>
      </section>
      <section>
        <h3>Connections, on your terms</h3>
        <div className="connection-row">
          <EnvelopeSimple size={22} />
          <span>
            Email discovery<small>Not connected · planned opt-in integration</small>
          </span>
          <span className="soft-badge">PLANNED</span>
        </div>
        <div className="connection-row">
          <CloudSlash size={22} />
          <span>
            Encrypted sync<small>Not connected · vault stays on this device</small>
          </span>
          <span className="soft-badge">PLANNED</span>
        </div>
        <a className="settings-row" href="/sign-in">
          <UserCircle size={20} />
          <span>
            Optional email sign-in<small>Separate from your vault and encryption key</small>
          </span>
          <ArrowRight size={17} />
        </a>
        <p className="small muted">
          Signing in does not upload or sync your vault. We do not access your bank account or scan
          your inbox in this release.
        </p>
      </section>
      <section>
        <h3>Our data promise</h3>
        <ul className="promise-list">
          <li>
            <Check size={17} /> No financial data sent to our server.
          </li>
          <li>
            <Check size={17} /> No tracking pixels or third-party analytics.
          </li>
          <li>
            <Check size={17} /> No bank credentials. No sale of your data.
          </li>
        </ul>
        <div className="legal-links">
          <a href="/privacy">
            Privacy policy
            <ArrowSquareOut size={14} />
          </a>
          <a href="/terms">
            Terms of use
            <ArrowSquareOut size={14} />
          </a>
        </div>
        <p className="small muted">
          Your browser and hosting provider handle normal page requests. Optional AI downloads
          contact model hosts. Device security and backups still matter.
        </p>
      </section>
      {mode !== "demo" && (
        <button className="text-button danger" onClick={onErase}>
          <Trash size={17} /> Delete local vault
        </button>
      )}
    </div>
  );
}
