"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageToggle, useLocale } from "../LocaleProvider";
import {
  getPlayerSession,
  signInPlayer,
  signUpPlayer,
  signOutPlayer,
  restoreOrInitializeCloudProgress
} from "../../game/services/playerAccount.mjs";

export default function AccountPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get("google_error");
    if (params.get("google") === "connected") {
      setMessage(ar ? "تم تسجيل الدخول باستخدام Google. الحفظ السحابي متوقف مؤقتاً أثناء تأمين تقدمك." : "Signed in with Google. Cloud saving is temporarily paused while progression security is upgraded.");
    } else if (googleError) {
      const messages = {
        cloud_unconfigured: ar ? "خدمة الحسابات السحابية غير مهيأة بعد." : "Cloud accounts are not configured yet.",
        google_denied: ar ? "تم إلغاء تسجيل الدخول باستخدام Google." : "Google sign-in was cancelled.",
        oauth_invalid_state: ar ? "تعذر التحقق من طلب تسجيل الدخول. حاول مرة أخرى." : "The sign-in request could not be verified. Please try again.",
        oauth_exchange_failed: ar ? "تعذر إكمال تسجيل الدخول باستخدام Google." : "Google sign-in could not be completed."
      };
      setError(messages[googleError] || (ar ? "حدث خطأ أثناء تسجيل الدخول." : "Google sign-in failed."));
    }
    if (params.has("google") || params.has("google_error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    let active = true;
    getPlayerSession()
      .then(async ({ user: current }) => {
        if (!active) return;
        setUser(current);
        if (current) {
          try {
            await restoreOrInitializeCloudProgress();
            if (active) setMessage(ar ? "تم التحقق من حسابك؛ تقدم اللعب محفوظ محلياً حالياً." : "Your account is connected; gameplay progress is currently saved locally.");
          } catch (reason) {
            if (active) setError(reason.message);
          }
        }
      })
      .catch((reason) => {
        if (active && !String(reason.message).includes("Failed to fetch")) setError(reason.message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = mode === "signin"
        ? await signInPlayer(email, password)
        : await signUpPlayer(email, password);
      if (result.needsEmailConfirmation) {
        setMessage(ar
          ? "تم إنشاء الحساب. افتح رسالة التأكيد في بريدك الإلكتروني، ثم عد لتسجيل الدخول."
          : "Account created. Confirm your email, then return here to sign in.");
        return;
      }
      setUser(result.user);
      await restoreOrInitializeCloudProgress();
      setMessage(ar ? "تم تسجيل الدخول بنجاح. الحفظ المحلي مستمر والمزامنة السحابية متوقفة مؤقتاً." : "Signed in. Local saves remain active; cloud progression sync is temporarily paused.");
      setPassword("");
    } catch (reason) {
      setError(reason.message || (ar ? "تعذر إكمال العملية." : "The request could not be completed."));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await signOutPlayer();
      setUser(null);
      setMessage(ar ? "تم تسجيل الخروج. تقدم اللعب محفوظ محلياً على هذا الجهاز." : "Signed out. Your local gameplay progress remains saved on this device.");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="info-shell">
      <section className="info-card account-card">
        <div className="stages-top">
          <span className="eyebrow">{ar ? "حساب اللاعب" : "PLAYER ACCOUNT"}</span>
          <LanguageToggle />
        </div>
        <h1>{ar ? "احفظ مغامرتك" : "Save Your Adventure"}</h1>
        <p className="account-intro">
          {ar
            ? "يمكنك اللعب فوراً كضيف دون تسجيل الدخول. سيُحفظ تقدمك على هذا الجهاز. الحساب اختياري، لكن المزامنة السحابية متوقفة مؤقتاً حتى نؤمّن حفظ المراحل والعملات من التلاعب."
            : "You can play immediately as a guest without signing in. Your progress stays on this device. Accounts are optional; cloud sync is temporarily paused while stage and coin saving are secured against tampering."}
        </p>

        <div className="guest-play-panel"><strong>{ar ? "لا تحتاج إلى حساب للعب!" : "No account needed to play!"}</strong><p>{ar ? "تقدم الضيف يُحفظ محلياً تلقائياً. التسجيل مطلوب فقط للمزامنة السحابية." : "Guest progress is saved locally automatically. Sign-in is only needed for cloud sync."}</p><Link className="primary-link" href="/stages">{ar ? "متابعة اللعب كضيف" : "Continue as Guest"}</Link></div>

        {loading ? (
          <div className="account-status">{ar ? "جارٍ التحقق من الحساب..." : "Checking account..."}</div>
        ) : user ? (
          <div className="account-signed-in">
            <div className="account-avatar" aria-hidden="true">✦</div>
            <strong>{ar ? "أنت مسجل الدخول" : "You are signed in"}</strong>
            <span className="account-email">{user.email}</span>
            <p>{ar ? "الحساب متصل، لكن مزامنة تقدم اللعب متوقفة مؤقتاً. يستمر الحفظ المحلي دون انقطاع." : "Your account is connected, but gameplay progress sync is temporarily paused. Local saving continues."}</p>
            <button className="account-submit" type="button" onClick={logout} disabled={busy}>
              {busy ? (ar ? "لحظة..." : "Please wait...") : (ar ? "تسجيل الخروج" : "Sign out")}
            </button>
          </div>
        ) : (
          <>
            <div className="account-tabs" role="tablist" aria-label={ar ? "نوع العملية" : "Account action"}>
              <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>
                {ar ? "تسجيل الدخول" : "Sign in"}
              </button>
              <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>
                {ar ? "إنشاء حساب" : "Create account"}
              </button>
            </div>
            <a className="google-signin-button" href="/api/player/account/google">
              <span className="google-mark" aria-hidden="true">G</span>
              {ar ? "المتابعة باستخدام Google" : "Continue with Google"}
            </a>
            <div className="account-or-divider"><span>{ar ? "أو بالبريد الإلكتروني" : "OR WITH EMAIL"}</span></div>
            <form className="account-form" onSubmit={submit}>
              <label htmlFor="player-email">{ar ? "البريد الإلكتروني" : "Email address"}</label>
              <input id="player-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="player@example.com" />
              <label htmlFor="player-password">{ar ? "كلمة المرور" : "Password"}</label>
              <input id="player-password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={ar ? "٨ أحرف على الأقل" : "At least 8 characters"} />
              <button className="account-submit" type="submit" disabled={busy}>
                {busy
                  ? (ar ? "جارٍ التنفيذ..." : "Please wait...")
                  : mode === "signin"
                    ? (ar ? "دخول ومزامنة التقدم" : "Sign in & sync progress")
                    : (ar ? "إنشاء حساب لاعب" : "Create player account")}
              </button>
            </form>
          </>
        )}

        {error && <p className="account-feedback account-error" role="alert">{error}</p>}
        {message && <p className="account-feedback account-success" role="status">{message}</p>}
        <p className="account-security">
          {ar
            ? "كلمة المرور لا تُخزّن في اللعبة. تتم المصادقة عبر Supabase، وتُحمى بيانات كل لاعب بسياسات وصول خاصة بحسابه."
            : "The game never stores your password. Supabase handles authentication, and database policies isolate each player's progress."}
        </p>
        <nav className="info-nav">
          <Link className="secondary-link" href="/stages">{ar ? "اللعب كضيف" : "Play as Guest"}</Link>
          <Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link>
          <Link className="secondary-link" href="/stages">{ar ? "المراحل" : "Stages"}</Link>
        </nav>
      </section>
    </main>
  );
}
