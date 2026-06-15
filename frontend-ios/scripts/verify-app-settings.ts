import assert from "node:assert/strict";
import {
  NOTIFICATION_ENABLED_KEY,
  isNotificationEnabled,
  loadAppSettings,
  saveAppSettings,
} from "../src/appSettings";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const storage = new MemoryStorage();

assert.deepEqual(loadAppSettings(storage), {
  notificationEnabled: true,
});

saveAppSettings({ notificationEnabled: false }, storage);

assert.equal(storage.getItem(NOTIFICATION_ENABLED_KEY), "false");
assert.deepEqual(loadAppSettings(storage), {
  notificationEnabled: false,
});
assert.equal(isNotificationEnabled(storage), false);

console.log("app settings persistence scenarios passed");
