import { app, dialog } from "electron";
import type { AppUpdater } from "electron-updater";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { autoUpdater } = require("electron-updater") as { autoUpdater: AppUpdater };

let initialized = false;

export function initAutoUpdater() {
  if (!app.isPackaged || initialized) {
    return;
  }

  initialized = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.info("[updater] checking for updates");
  });

  autoUpdater.on("update-available", (info) => {
    console.info("[updater] update available", info.version);
  });

  autoUpdater.on("update-not-available", (info) => {
    console.info("[updater] update not available", info.version);
  });

  autoUpdater.on("error", (error) => {
    console.error("[updater] update check failed", error);
  });

  autoUpdater.on("update-downloaded", async (info) => {
    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Windhoox update ready",
      message: `Windhoox ${info.version} has been downloaded.`,
      detail: "Restart the app to apply the update."
    });

    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((error) => {
      console.error("[updater] checkForUpdates failed", error);
    });
  }, 3000);
}
