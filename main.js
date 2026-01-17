  const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");
  const path = require("path");
  const fs = require("fs");

  let mainWindow = null;

  const PLAYLIST_FILE = path.join(__dirname, "playlist.json");
  const ALBUMS_FILE = path.join(__dirname, "albums.json");
  const MUSIC_DIR = path.join(__dirname, "music");

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 900,
      height: 600,
      minWidth: 700,
      minHeight: 400,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      titleBarStyle: "hiddenInset",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
      },
    });

    Menu.setApplicationMenu(null);
    mainWindow.loadFile(path.join(__dirname, "frontend", "index.html"));
  }

  ipcMain.on("window:minimize", () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on("window:close", () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle("dialog:open-audio", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Audio", extensions: ["mp3", "wav", "flac", "ogg", "m4a"] },
      ],
    });

    if (canceled || !filePaths || !filePaths[0]) return null;
    return filePaths[0];
  });

  ipcMain.handle("song:save-to-music", async (_event, srcFullPath, fileName) => {
    try {
      if (!fs.existsSync(MUSIC_DIR)) {
        fs.mkdirSync(MUSIC_DIR, { recursive: true });
      }

      const destPath = path.join(MUSIC_DIR, fileName);
      fs.copyFileSync(srcFullPath, destPath);

      return { ok: true, destPath };
    } catch (err) {
      console.error("copy error:", err);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("music:list-files", async () => {
    try {
      if (!fs.existsSync(MUSIC_DIR)) {
        return [];
      }
      const entries = fs.readdirSync(MUSIC_DIR, { withFileTypes: true });
      const files = entries
        .filter((d) => d.isFile())
        .map((d) => {
          const fullPath = path.join(MUSIC_DIR, d.name);
          return {
            filename: d.name,
            path: fullPath,
            title: path.parse(d.name).name,
            artist: "Unknown",
          };
        });
      return files;
    } catch (err) {
      console.error("list music files error:", err);
      return [];
    }
  });

  ipcMain.handle("playlist:load", async () => {
    try {
      if (!fs.existsSync(PLAYLIST_FILE)) return [];
      const raw = fs.readFileSync(PLAYLIST_FILE, "utf8");
      if (!raw.trim()) return [];
      return JSON.parse(raw);
    } catch (err) {
      console.error("load playlist error:", err);
      return [];
    }
  });

  ipcMain.handle("playlist:save", async (_event, songs) => {
    try {
      fs.writeFileSync(PLAYLIST_FILE, JSON.stringify(songs, null, 2), "utf8");
      return { ok: true };
    } catch (err) {
      console.error("save playlist error:", err);
      return { ok: false, error: err.message };
    }
  });

  // albums.json
  ipcMain.handle("albums:load", async () => {
    try {
      if (!fs.existsSync(ALBUMS_FILE)) return [];
      const raw = fs.readFileSync(ALBUMS_FILE, "utf8");
      if (!raw.trim()) return [];
      return JSON.parse(raw);
    } catch (err) {
      console.error("load albums error:", err);
      return [];
    }
  });

  ipcMain.handle("albums:save", async (_event, albums) => {
    try {
      fs.writeFileSync(ALBUMS_FILE, JSON.stringify(albums, null, 2), "utf8");
      return { ok: true };
    } catch (err) {
      console.error("save albums error:", err);
      return { ok: false, error: err.message };
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
