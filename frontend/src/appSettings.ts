export const NOTIFICATION_ENABLED_KEY = "baseballCoachNotificationEnabled";
export const DARK_MODE_ENABLED_KEY = "baseballCoachDarkModeEnabled";

export interface AppSettings {
  notificationEnabled: boolean;
  darkModeEnabled: boolean;
}

type SettingsStorage = Pick<Storage, "getItem" | "setItem">;

function readBoolean(storage: SettingsStorage, key: string, fallback: boolean) {
  const value = storage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

export function loadAppSettings(storage: SettingsStorage = localStorage): AppSettings {
  return {
    notificationEnabled: readBoolean(storage, NOTIFICATION_ENABLED_KEY, true),
    darkModeEnabled: readBoolean(storage, DARK_MODE_ENABLED_KEY, false),
  };
}

export function saveAppSettings(
  settings: AppSettings,
  storage: SettingsStorage = localStorage,
) {
  storage.setItem(NOTIFICATION_ENABLED_KEY, String(settings.notificationEnabled));
  storage.setItem(DARK_MODE_ENABLED_KEY, String(settings.darkModeEnabled));
}

export function isNotificationEnabled(storage: Pick<Storage, "getItem"> = localStorage) {
  return storage.getItem(NOTIFICATION_ENABLED_KEY) !== "false";
}

export function applyDarkMode(enabled: boolean) {
  document.documentElement.classList.toggle("theme-dark", enabled);
  document.documentElement.style.colorScheme = enabled ? "dark" : "light";
}
