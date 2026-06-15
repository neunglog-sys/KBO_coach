export const NOTIFICATION_ENABLED_KEY = "baseballCoachNotificationEnabled";

export interface AppSettings {
  notificationEnabled: boolean;
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
  };
}

export function saveAppSettings(
  settings: AppSettings,
  storage: SettingsStorage = localStorage,
) {
  storage.setItem(NOTIFICATION_ENABLED_KEY, String(settings.notificationEnabled));
}

export function isNotificationEnabled(storage: Pick<Storage, "getItem"> = localStorage) {
  return storage.getItem(NOTIFICATION_ENABLED_KEY) !== "false";
}
