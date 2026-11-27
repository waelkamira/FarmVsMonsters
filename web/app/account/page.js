"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { LanguageToggle, useLocale } from "../LocaleProvider";
import {
  getPlayerSession,
  signInPlayer,
  signOutPlayer
} from "../../game/services/playerAccount.mjs";

function subscribeToLocation(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getLocationSearch() {
  return window.location.search;
}

export default function AccountPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const search = useSyncExternalStore(subscribeToLocation, getLocationSearch, () => "");
  const params = new URLSearchParams(search);
  const googleError = params.get("google_error");
  const oauthMessage = params.get("google") === "connected"
    ? (ar ? "تسجيل الدخول باستخدام Google متوقف مؤقتاً." : "Google sign-in is temporarily paused.")
    : "";
  const oauthErrorMessages = {
    cloud_unconfigured: ar ? "خدمة الحسابات السحابية غير مهيأة بعد." : "Cloud accounts are not configured yet.",
    registration_paused: ar ? "تسجيل الحسابات الجديدة وتسجيل Google متوقفان مؤقتاً حتى يصبح حفظ التقدم السحابي آمناً." : "New registrations and Google sign-in are paused until secure cloud progress saving is available.",
    google_denied: ar ? "تم إلغاء تسجيل الدخول باستخدام Google." : "Google sign-in was cancelled.",
    oauth_invalid_state: ar ? "تعذر التحقق من طلب تسجيل الدخول. حاول مرة أخرى." : "The sign-in request could not be verified. Please try again.",
    oauth_exchange_failed: ar ? "تعذر إكمال تسجيل الدخول باستخدام Google." : "Google sign-in could not be completed."
  };
  const oauthError = googleError
    ? (oauthErrorMessages[googleError] || (ar ? "حدث خطأ أثناء تسجيل الدخول." : "Google sign-in failed."))
    : "";
  const hasOAuthFeedback = Boolean(googleError || params.get("google") === "connected");

  useEffect(() => {
    let active = true;
    getPlayerSession()
      .then(async ({ user: current }) => {
        if (!active) return;
        setUser(current);
        if (current && !hasOAuthFeedback) {
          setMessage(ar ? "تم التحقق من الحساب. تقدم اللعب غير محفوظ في الحساب أو على الجهاز حالياً." : "Your account is connected. Game progress is not currently saved to this account or device.");
        }
      })
      .catch((reason) => {
        if (active && !hasOAuthFeedback && !String(reason.message).includes("Failed to fetch")) setError(reason.message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ar, hasOAuthFeedback]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await signInPlayer(email, password);
      setUser(result.user);
      setMessage(ar ? "تم تسجيل الدخول. لكن تقدم اللعبة لا يُحفظ بعد؛ الحساب ليس نسخة احتياطية لتقدمك." : "Signed in. Game progress is not saved yet; this account is not a backup of your progress.");
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
      setMessage(ar ? "تم تسجيل الخروج. تذكر أن تقدم اللعبة غير محفوظ حالياً." : "Signed out. Remember that game progress is not currently saved.");
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
        <h1>{ar ? "تسجيل دخول اللاعب" : "Player Sign In"}</h1>
        <p className="account-intro">
          {ar
            ? "يمكنك اللعب دون حساب. لكن حفظ التقدم المحلي والسحابي غير متاح حالياً. تسجيل الدخول متاح للحسابات الموجودة فقط، ولا يحفظ تقدم اللعبة أو العملات."
            : "You can play without an account. Game progress is not currently saved locally or in the cloud. Sign-in is available for existing accounts only and does not save game progress or coins."}
        </p>

        <div className="guest-play-panel"><strong>{ar ? "يمكنك اللعب كضيف" : "You can play as a guest"}</strong><p>{ar ? "اللعب متاح، لكن التقدم والعملات والمكافآت لن تُحفظ حتى تكتمل منظومة الحفظ الآمن." : "Gameplay is available, but progress, coins, and rewards will not be saved until secure saving is complete."}</p><Link className="primary-link" href="/stages">{ar ? "متابعة اللعب" : "Continue Playing"}</Link></div>

        {loading ? (
          <div className="account-status">{ar ? "جارٍ التحقق من الحساب..." : "Checking account..."}</div>
        ) : user ? (
          <div className="account-signed-in">
            <div className="account-avatar" aria-hidden="true">✦</div>
            <strong>{ar ? "أنت مسجل الدخول" : "You are signed in"}</strong>
            <span className="account-email">{user.email}</span>
            <p>{ar ? "الحساب متصل، لكن تقدم اللعبة والعملات لا تُحفظ حالياً." : "Your account is connected, but game progress and coins are not currently saved."}</p>
            <button className="account-submit" type="button" onClick={logout} disabled={busy}>
              {busy ? (ar ? "لحظة..." : "Please wait...") : (ar ? "تسجيل الخروج" : "Sign out")}
            </button>
          </div>
        ) : (
          <>
            <div className="account-signin-notice">
              {ar ? "التسجيل الجديد وتسجيل Google متوقفان مؤقتاً. يمكنك تسجيل الدخول إلى حساب موجود فقط." : "New registration and Google sign-in are temporarily paused. Only existing accounts can sign in."}
            </div>
            <form className="account-form" onSubmit={submit}>
              <label htmlFor="player-email">{ar ? "البريد الإلكتروني" : "Email address"}</label>
              <input id="player-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="player@example.com" />
              <label htmlFor="player-password">{ar ? "كلمة المرور" : "Password"}</label>
              <input id="player-password" type="password" autoComplete="current-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={ar ? "كلمة مرور حسابك الحالي" : "Your existing account password"} />
              <button className="account-submit" type="submit" disabled={busy}>
                {busy ? (ar ? "جارٍ تسجيل الدخول..." : "Signing in...") : (ar ? "تسجيل الدخول" : "Sign in")}
              </button>
            </form>
          </>
        )}

        {(error || oauthError) && <p className="account-feedback account-error" role="alert">{error || oauthError}</p>}
        {(message || oauthMessage) && <p className="account-feedback account-success" role="status">{message || oauthMessage}</p>}
        <p className="account-security">
          {ar
            ? "كلمة المرور لا تُخزّن في اللعبة. تتم المصادقة عبر Supabase، لكن حفظ تقدم اللعب غير متاح حالياً."
            : "The game never stores your password. Supabase handles authentication, but game progress saving is not currently available."}
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
