import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("windhoox", {
  appName: "Windhoox",
  platform: process.platform
});

