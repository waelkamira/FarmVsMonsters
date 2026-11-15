import {
  CAMPAIGN_PROGRESS_KEY,
  PROGRESSION_STORAGE_KEY,
  loadUnlockedStage,
  loadSavedCoins,
  saveCoins,
  unlockNextStage
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
  let completedStages = [];
  try {
    const campaign = JSON.parse(storage.getItem(CAMPAIGN_PROGRESS_KEY) || "{}");
    if (Array.isArray(campaign.completedStages)) {
      completedStages = campaign.completedStages.filter((value) => Number.isInteger(value) && value >= 1 && value <= 10);
    }
  } catch { /* Use the safe default below. */ }
  return {
    unlockedStage: loadUnlockedStage(storage),
    completedStages,
    coins: loadSavedCoins(storage)
  };
}

export function applyRemotePlayerProgress(progress, storage = window.localStorage) {
  if (!progress || !storage) return false;
  const unlockedStage = Math.min(10, Math.max(1, Number(progress.unlocked_stage) || 1));
  const completedStages = Array.isArray(progress.completed_stages)
    ? progress.completed_stages.filter((value) => Number.isInteger(value) && value >= 1 && value < unlockedStage)
    : [];
  try {
    storage.setItem(CAMPAIGN_PROGRESS_KEY, JSON.stringify({
      version: 1,
      unlockedStage,
      completedStages
    }));
    saveCoins(storage, progress.coins);
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

export async function saveCloudProgress(progress = readLocalPlayerProgress()) {
  return requestJson("/api/player/progress", {
    method: "PUT",
    body: JSON.stringify(progress)
  });
}

export async function restoreOrInitializeCloudProgress() {
  const result = await loadCloudProgress();
  if (result.progress) {
    applyRemotePlayerProgress(result.progress);
    return { restored: true, progress: result.progress };
  }
  const local = readLocalPlayerProgress();
  await saveCloudProgress(local);
  return { restored: false, progress: local };
}

export async function syncProgressAfterVictory() {
  try {
    return await saveCloudProgress(readLocalPlayerProgress());
  } catch {
    return null;
  }
}
