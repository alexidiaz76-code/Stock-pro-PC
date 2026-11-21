const { app, BrowserWindow, protocol, net, shell, session, Menu, dialog } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

const WWW = path.join(__dirname, 'www');
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    title: 'StockPro', icon: path.join(__dirname, 'icon.png'), backgroundColor: '#0b1220',
    webPreferences: { contextIsolation: true, nodeIntegration: false, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  win.setMenuBarVisibility(false);
  win.loadURL('app://stockpro/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:|tel:|whatsapp:)/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:|^mailto:|^tel:|^whatsapp:/i.test(url)) shell.openExternal(url); }
  });
  // Atajos: F11 pantalla completa, Ctrl+Mas/Menos zoom, F5 recargar
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (i.key === 'F5' || (i.control && i.key.toLowerCase() === 'r')) { win.reload(); e.preventDefault(); }
    else if (i.control && (i.key === '+' || i.key === '=')) { win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5); e.preventDefault(); }
    else if (i.control && i.key === '-') { win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5); e.preventDefault(); }
    else if (i.control && i.key === '0') { win.webContents.setZoomLevel(0); e.preventDefault(); }
  });
  // Las descargas (copias de seguridad, PDFs) abren el cuadro de "Guardar como"
  win.webContents.session.on('will-download', () => {});
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); } else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    protocol.handle('app', req => {
      let p = decodeURIComponent(new URL(req.url).pathname);
      if (p === '/' || p === '') p = '/index.html';
      const f = path.normalize(path.join(WWW, p));
      if (!f.startsWith(WWW)) return new Response('No', { status: 403 });
      return net.fetch(pathToFileURL(f).toString());
    });
    // Permisos: cámara, micrófono y notificaciones solo para la propia app
    session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen'].includes(perm)));
    session.defaultSession.setPermissionCheckHandler(() => true);
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => app.quit());
}
