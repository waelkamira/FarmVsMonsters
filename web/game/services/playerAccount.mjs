import {
  CAMPAIGN_PROGRESS_KEY,
  loadUnlockedStage,
  loadCompletedStages,
  loadSavedCoins,
  saveCoins
} from "../rules/phaseOneRules.mjs";

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The account service could not complete the request.");
  return payload;
}

export function readLocalPlayerProgress(storage = window.localStorage) {
  return {
    unlockedStage: loadUnlockedStage(storage),
    completedStages: loadCompletedStages(storage),
    coins: loadSavedCoins(storage)
  };
}

export function applyRemotePlayerProgress(progress, storage = window.localStorage) {
  if (!progress || !storage) return false;
  const unlockedStage = Math.min(10, Math.max(1, Number(progress.unlocked_stage) || 1));
  const isCompletedStage = (stage) =>
    Number.isInteger(stage) &&
    stage >= 1 &&
    (stage < unlockedStage || (stage === 10 && unlockedStage === 10));
  const completedStages = Array.isArray(progress.completed_stages)
    ? [...new Set(progress.completed_stages.filter(isCompletedStage))].sort((a, b) => a - b)
    : [];
  try {
    storage.setItem(CAMPAIGN_PROGRESS_KEY, JSON.stringify({
      version: 1,
      unlockedStage,
      completedStages
    }));
    if (progress.coins_verified === true) saveCoins(storage, progress.coins);
    return true;
  } catch {
    return false;
  }
}

export async function getPlayerSession() {
  return requestJson("/api/player/account");
}

export async function signInPlayer(email, password) {
  return requestJson("/api/player/account", {
    method: "POST",
    body: JSON.stringify({ action: "signin", email, password })
  });
}

export async function signUpPlayer(email, password) {
  return requestJson("/api/player/account", {
    method: "POST",
    body: JSON.stringify({ action: "signup", email, password })
  });
}

export async function signOutPlayer() {
  return requestJson("/api/player/account", { method: "DELETE" });
}

export async function loadCloudProgress() {
  return requestJson("/api/player/progress");
}

export async function restoreOrInitializeCloudProgress() {
  const result = await loadCloudProgress();
  const local = readLocalPlayerProgress();
  const cloud = result.progress;

  if (!cloud || cloud.progress_verified !== true) {
    // Legacy cloud stages and balances were previously writable by clients.
    // Keep this device's local save, but never import those unverified values.
    return {
      restored: false,
      progress: local,
      cloudProgress: cloud || null,
      reason: cloud ? "cloud-progress-unverified" : "no-cloud-progress"
    };
  }

  // Progress is monotonic: an older verified cloud snapshot must never
  // overwrite a newer campaign unlock already earned on this device.
  const cloudUnlockedStage = Math.min(10, Math.max(1, Number(cloud.unlocked_stage) || 1));
  const unlockedStage = Math.max(local.unlockedStage, cloudUnlockedStage);
  const isCompletedStage = (stage) =>
    Number.isInteger(stage) &&
    stage >= 1 &&
    (stage < unlockedStage || (stage === 10 && unlockedStage === 10));
  const cloudCompletedStages = Array.isArray(cloud.completed_stages)
    ? cloud.completed_stages.filter(isCompletedStage)
    : [];
  const completedStages = [...new Set([
    ...local.completedStages,
    ...cloudCompletedStages
  ].filter(isCompletedStage))].sort((a, b) => a - b);
  const coins = cloud.coins_verified === true
    ? (Number(cloud.coins) || 0)
    : local.coins;

  applyRemotePlayerProgress({
    unlocked_stage: unlockedStage,
    completed_stages: completedStages,
    coins,
    coins_verified: cloud.coins_verified === true
  });

  return {
    restored: true,
    progress: { unlockedStage, completedStages, coins },
    cloudProgress: cloud
  };
}
