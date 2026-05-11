/** Баланс, отзывы и история заявок по нику: переживают выход (основной ключ профиля при logout очищается). */
const LEDGER_KEY = "sunstrike_user_ledger";

function userKey(username) {
  return (username || "").trim().toLowerCase();
}

export function readUserLedger() {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeUserLedger(map) {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(map));
}

/**
 * @param {string} username
 * @param {{
 *   balance?: number,
 *   reviews?: Array,
 *   applications?: Array,
 *   avatarData?: string,
 *   avatarPosX?: number,
 *   avatarPosY?: number
 * }} payload
 */
export function syncUserLedger(username, payload) {
  const key = userKey(username);
  if (!key) return;
  const map = readUserLedger();
  const prev = map[key] && typeof map[key] === "object" ? map[key] : {};
  map[key] = {
    balance: Number.isFinite(payload.balance) ? payload.balance : Number.isFinite(prev.balance) ? prev.balance : 0,
    reviews: Array.isArray(payload.reviews) ? payload.reviews : Array.isArray(prev.reviews) ? prev.reviews : [],
    applications: Array.isArray(payload.applications)
      ? payload.applications
      : Array.isArray(prev.applications)
        ? prev.applications
        : [],
    avatarData:
      typeof payload.avatarData === "string"
        ? payload.avatarData
        : typeof prev.avatarData === "string"
          ? prev.avatarData
          : "",
    avatarPosX: Number.isFinite(payload.avatarPosX)
      ? payload.avatarPosX
      : Number.isFinite(prev.avatarPosX)
        ? prev.avatarPosX
        : 50,
    avatarPosY: Number.isFinite(payload.avatarPosY)
      ? payload.avatarPosY
      : Number.isFinite(prev.avatarPosY)
        ? prev.avatarPosY
        : 50
  };
  writeUserLedger(map);
}

/**
 * Аватар для отображения по нику: у текущего пользователя — из профиля (живое обновление),
 * у остальных — последний сохранённый в ledger на этом устройстве.
 * @param {string} nickname
 * @param {{ nickname?: string, avatarData?: string, avatarPosX?: number, avatarPosY?: number }} currentProfile
 */
export function getReviewerAvatarForDisplay(nickname, currentProfile) {
  const key = userKey(nickname);
  if (!key) {
    return { hasImage: false, avatarData: "", avatarPosX: 50, avatarPosY: 50 };
  }
  const myKey = userKey(currentProfile?.nickname || "");
  if (key === myKey && currentProfile) {
    const avatarData = typeof currentProfile.avatarData === "string" ? currentProfile.avatarData : "";
    return {
      hasImage: Boolean(avatarData),
      avatarData,
      avatarPosX: Number.isFinite(currentProfile.avatarPosX) ? currentProfile.avatarPosX : 50,
      avatarPosY: Number.isFinite(currentProfile.avatarPosY) ? currentProfile.avatarPosY : 50
    };
  }
  const row = readUserLedger()[key];
  const avatarData = typeof row?.avatarData === "string" ? row.avatarData : "";
  if (!avatarData) {
    return { hasImage: false, avatarData: "", avatarPosX: 50, avatarPosY: 50 };
  }
  return {
    hasImage: true,
    avatarData,
    avatarPosX: Number.isFinite(row.avatarPosX) ? row.avatarPosX : 50,
    avatarPosY: Number.isFinite(row.avatarPosY) ? row.avatarPosY : 50
  };
}

/** Подмешать сохранённые локально данные, если для этого ника есть запись. */
export function mergeLedgerIntoProfile(username, profile) {
  const key = userKey(username);
  if (!key) return profile;
  const row = readUserLedger()[key];
  if (!row || typeof row !== "object") return profile;
  return {
    ...profile,
    balance: Number.isFinite(row.balance) ? row.balance : profile.balance,
    reviews: Array.isArray(row.reviews) ? row.reviews : profile.reviews,
    applications: Array.isArray(row.applications) ? row.applications : profile.applications
  };
}
