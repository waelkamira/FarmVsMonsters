"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import { loadUnlockedStage } from "../../game/rules/phaseOneRules.mjs";
import { getPlayerSession, restoreOrInitializeCloudProgress } from "../../game/services/playerAccount.mjs";
import { CAMPAIGN_WORLDS, MISSIONS_PER_WORLD } from "../../game/data/campaignWorlds.mjs";

function MissionNode({ world, mission, ar, unlockedStage }) {
  const isFirstMission = mission === 1;
  const isCurrentWorld = world.currentStage === 1;
  const isSecondWorld = world.id === "broken-coast";
  const isPlayable = isFirstMission && isCurrentWorld;
  const isSecondIntroUnlocked = isFirstMission && isSecondWorld && unlockedStage >= 2;
  const className = [
    "campaign-mission-node",
    isPlayable ? "is-playable" : "",
    isSecondIntroUnlocked ? "is-unlocked-preview" : "",
    !isPlayable && !isSecondIntroUnlocked ? "is-locked" : ""
  ].filter(Boolean).join(" ");

  const content = (
    <>
      <span className="campaign-mission-number">{String(mission).padStart(2, "0")}</span>
      <span className="campaign-mission-state">
        {isPlayable ? "▶" : isSecondIntroUnlocked ? "★" : "🔒"}
      </span>
    </>
  );

  if (isPlayable) {
    return <Link className={className} href="/stage/1" aria-label={ar ? "ابدأ المهمة الأولى" : "Start mission one"}>{content}</Link>;
  }
  if (isSecondIntroUnlocked) {
    return <Link className={className} href="/stage/2" aria-label={ar ? "استكشف مقدمة الساحل" : "Explore the coast introduction"}>{content}</Link>;
  }
  return <span className={className} aria-label={ar ? `المهمة ${mission} مقفلة أو قيد التصميم` : `Mission ${mission} locked or in design`}>{content}</span>;
}

export default function StagesPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [unlockedStage, setUnlockedStage] = useState(1);

  useEffect(() => {
    let active = true;

    try {
      setUnlockedStage(loadUnlockedStage(window.localStorage));
    } catch {
      setUnlockedStage(1);
    }

    async function restoreAccountProgress() {
      try {
        const session = await getPlayerSession();
        if (!active || !session?.user) return;
        const result = await restoreOrInitializeCloudProgress();
        const cloudUnlocked = Number(result?.progress?.unlockedStage);
        if (active && Number.isInteger(cloudUnlocked)) {
          setUnlockedStage(Math.min(10, Math.max(1, cloudUnlocked)));
        }
      } catch {
        // The local save remains usable when the account service is offline.
      }
    }

    restoreAccountProgress();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="campaign-map-shell" dir={ar ? "rtl" : "ltr"}>
      <div className="campaign-map-topbar">
        <Link className="campaign-map-back" href="/">{ar ? "← القائمة الرئيسية" : "← Main Menu"}</Link>
        <Link className="campaign-map-back" href="/account">{ar ? "حساب اللاعب" : "Player Account"}</Link>
        <LanguageToggle />
      </div>

      <header className="campaign-map-heading">
        <span className="campaign-map-eyebrow">{ar ? "رحلة إنقاذ الأميرة" : "THE RESCUE CAMPAIGN"}</span>
        <h1>{ar ? "خريطة العوالم" : "World Map"}</h1>
        <p>{ar
          ? "11 أرضاً تنتظر المزارع. افتح الطريق تدريجياً، اهزم التنين في كل أرض، وأنقذ الأميرة."
          : "Eleven lands await the farmer. Open the path step by step, defeat each land's dragon, and rescue the princess."}</p>
        <div className="campaign-map-stats">
          <span><strong>11</strong>{ar ? " عالماً مخططاً" : " planned worlds"}</span>
          <span><strong>10</strong>{ar ? " مهمات لكل عالم" : " planned missions per world"}</span>
          <span><strong>{unlockedStage >= 2 ? "2" : "1"}</strong>{ar ? " منطقة متاحة بالمقدمة" : " region available in the intro"}</span>
        </div>
      </header>

      <section className="campaign-map-legend" aria-label={ar ? "دليل الخريطة" : "Map legend"}>
        <span><i className="legend-dot legend-playable" />{ar ? "قابلة للعب" : "Playable"}</span>
        <span><i className="legend-dot legend-preview" />{ar ? "مفتوحة — مقدمة فقط" : "Unlocked — intro only"}</span>
        <span><i className="legend-dot legend-locked" />{ar ? "مقفلة / قيد التصميم" : "Locked / in design"}</span>
      </section>

      <section className="campaign-world-list" aria-label={ar ? "مناطق الحملة" : "Campaign regions"}>
        {CAMPAIGN_WORLDS.map((world, index) => {
          const worldAvailable = index === 0 || (index === 1 && unlockedStage >= 2);
          return (
            <article className={`campaign-world-card theme-${world.theme} ${worldAvailable ? "world-is-open" : "world-is-locked"}`} key={world.id}>
              <div className="campaign-world-main">
                <div className="campaign-world-emblem" aria-hidden="true">{world.icon}</div>
                <div className="campaign-world-copy">
                  <div className="campaign-world-kicker">
                    <span>{ar ? `العالم ${String(index + 1).padStart(2, "0")}` : `WORLD ${String(index + 1).padStart(2, "0")}`}</span>
                    <b>{worldAvailable ? (index === 0 ? (ar ? "متاح" : "AVAILABLE") : (ar ? "مفتوح · مقدمة" : "UNLOCKED · INTRO")) : (ar ? "مقفل" : "LOCKED")}</b>
                  </div>
                  <h2>{ar ? world.ar : world.name}</h2>
                  <p className="campaign-world-subtitle">{ar ? world.subtitleAr : world.subtitle}</p>
                  <p className="campaign-world-description">{ar ? world.descriptionAr : world.description}</p>
                </div>
              </div>

              <div className="campaign-mission-track">
                <div className="campaign-track-label">
                  <span>{ar ? "مسار المهمات" : "MISSION PATH"}</span>
                  <small>{ar ? "10 مهمات مخططة" : "10 planned missions"}</small>
                </div>
                <div className="campaign-mission-nodes">
                  {Array.from({ length: MISSIONS_PER_WORLD }, (_, missionIndex) => (
                    <MissionNode
                      key={missionIndex + 1}
                      world={world}
                      mission={missionIndex + 1}
                      ar={ar}
                      unlockedStage={unlockedStage}
                    />
                  ))}
                </div>
                <div className="campaign-world-footnote">
                  {index === 0
                    ? (ar ? "المهمة 01 هي معركة المرحلة الأولى الحالية. بقية المسار مخطط ولم يُنفذ بعد." : "Mission 01 is the current Stage One battle. The rest of this route is planned, not implemented yet.")
                    : index === 1 && unlockedStage >= 2
                      ? (ar ? "مقدمة العالم مفتوحة في تقدمك؛ مهمات القتال لم تُنفذ بعد." : "The world introduction is unlocked in your progress; its battle missions are not implemented yet.")
                      : (ar ? "منطقة مستقبلية — ستُفتح بعد تجهيز قصتها ومهماتها." : "Future region — it will open when its story and missions are ready.")}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="campaign-map-footer">
        <p>{ar
          ? "الخريطة تعرض الخطة طويلة المدى، ولا تعني أن جميع المهمات أو المناطق جاهزة للعب. لن تُفتح أي معركة قبل تنفيذها واختبارها."
          : "This map shows the long-term campaign plan; it does not mean every mission or region is playable. No battle will unlock before it is implemented and tested."}</p>
        <Link href="/plants" className="campaign-map-secondary">{ar ? "موسوعة النباتات" : "Plant Codex"}</Link>
        <Link href="/monsters" className="campaign-map-secondary">{ar ? "موسوعة الوحوش" : "Monster Codex"}</Link>
      </footer>
    </main>
  );
}
