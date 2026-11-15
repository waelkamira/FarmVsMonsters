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
    let active = true;
    getPlayerSession()
      .then(({ user: current }) => { if (active) setUser(current); })
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
      setMessage(ar ? "تم تسجيل الدخول ومزامنة تقدمك بنجاح." : "Signed in. Your cloud progress is synced.");
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
      setMessage(ar ? "تم تسجيل الخروج. تقدمك محفوظ في حسابك." : "Signed out. Your progress remains saved to your account.");
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
            ? "أنشئ حساباً أو سجّل الدخول لحفظ المراحل التي أنجزتها والعملات، واستعادة تقدمك عند العودة."
            : "Create an account or sign in to save completed stages and coins, then restore your progress when you return."}
        </p>

        {loading ? (
          <div className="account-status">{ar ? "جارٍ التحقق من الحساب..." : "Checking account..."}</div>
        ) : user ? (
          <div className="account-signed-in">
            <div className="account-avatar" aria-hidden="true">✦</div>
            <strong>{ar ? "أنت مسجل الدخول" : "You are signed in"}</strong>
            <span className="account-email">{user.email}</span>
            <p>{ar ? "تتم مزامنة تقدم المراحل مع حسابك السحابي." : "Your stage progress is synced with your cloud account."}</p>
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
          <Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link>
          <Link className="secondary-link" href="/stages">{ar ? "المراحل" : "Stages"}</Link>
        </nav>
      </section>
    </main>
  );
}
