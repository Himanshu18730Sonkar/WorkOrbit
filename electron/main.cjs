const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const dbApi = require('./db.cjs');
const { exportInvoicePdf } = require('./pdf.cjs');

let mainWindow;
let runtimeLogPath = '';

function resolveAppIconPath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(__dirname, '..', 'dist', 'applogo.png'),
    path.join(__dirname, '..', 'public', 'applogo.png')
  ];
  return candidates.find((item) => fs.existsSync(item));
}

function writeRuntimeLog(message, details = '') {
  try {
    const line = `[${new Date().toISOString()}] ${message}${details ? ` | ${details}` : ''}\n`;
    if (!runtimeLogPath) {
      runtimeLogPath = path.join(process.cwd(), 'appmana-runtime.log');
    }
    fs.appendFileSync(runtimeLogPath, line, 'utf8');
  } catch (_error) {
  }
}

function openDebugTools(reason) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  writeRuntimeLog('OpenDevTools', reason);
  if (!mainWindow.webContents.isDevToolsOpened()) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function attachDiagnostics(windowInstance, isDevServer) {
  windowInstance.webContents.on('did-fail-load', (_event, code, description, validatedURL, isMainFrame) => {
    if (!isMainFrame) {
      return;
    }
    writeRuntimeLog('did-fail-load', `code=${code}; description=${description}; url=${validatedURL}`);
    if (!isDevServer) {
      openDebugTools('did-fail-load');
    }
  });

  windowInstance.webContents.on('render-process-gone', (_event, details) => {
    writeRuntimeLog('render-process-gone', JSON.stringify(details));
    if (!isDevServer) {
      openDebugTools('render-process-gone');
    }
  });

  windowInstance.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 3) {
      writeRuntimeLog('renderer-console-error', `${message} @ ${sourceId}:${line}`);
      if (!isDevServer) {
        openDebugTools('renderer-console-error');
      }
    }
  });

  windowInstance.webContents.on('did-finish-load', () => {
    writeRuntimeLog('did-finish-load', windowInstance.webContents.getURL());
  });
}

function createWindow() {
  const appIconPath = resolveAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f172a',
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const isDevServer = Boolean(devServerUrl);

  attachDiagnostics(mainWindow, isDevServer);

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function setupIpcHandlers() {
  ipcMain.handle('dashboard:get', () => dbApi.getDashboard());

  ipcMain.handle('clients:list', (_event, query = {}) => dbApi.listClients(query.search || '', query.sortBy || 'name'));
  ipcMain.handle('clients:save', (_event, payload) => dbApi.upsertClient(payload));
  ipcMain.handle('clients:delete', (_event, id) => dbApi.deleteClient(id));

  ipcMain.handle('leads:list', () => dbApi.listLeads());
  ipcMain.handle('leads:save', (_event, payload) => dbApi.upsertLead(payload));
  ipcMain.handle('leads:delete', (_event, id) => dbApi.deleteLead(id));

  ipcMain.handle('projects:list', () => dbApi.listProjects());
  ipcMain.handle('projects:save', (_event, payload) => dbApi.upsertProject(payload));
  ipcMain.handle('projects:delete', (_event, id) => dbApi.deleteProject(id));

  ipcMain.handle('tasks:list', () => dbApi.listTasks());
  ipcMain.handle('tasks:save', (_event, payload) => dbApi.upsertTask(payload));
  ipcMain.handle('tasks:delete', (_event, id) => dbApi.deleteTask(id));

  ipcMain.handle('invoices:list', () => dbApi.listInvoices());
  ipcMain.handle('invoices:save', (_event, payload) => dbApi.upsertInvoice(payload));
  ipcMain.handle('invoices:delete', (_event, id) => dbApi.deleteInvoice(id));
  ipcMain.handle('invoices:markPaid', (_event, id) => dbApi.markInvoicePaid(id));
  ipcMain.handle('invoiceTemplates:list', () => dbApi.listInvoiceTemplates());
  ipcMain.handle('invoiceTemplates:save', (_event, payload) => dbApi.upsertInvoiceTemplate(payload));
  ipcMain.handle('invoiceTemplates:delete', (_event, id) => dbApi.deleteInvoiceTemplate(id));
  ipcMain.handle('invoices:exportPdf', async (_event, id) => {
    const invoice = dbApi.getInvoiceById(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    const defaultDir = path.join(app.getPath('documents'), 'WorkOrbit Invoices');
    const defaultFile = path.join(defaultDir, `${invoice.invoice_number}.pdf`);
    const selection = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Invoice PDF',
      defaultPath: defaultFile,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (selection.canceled || !selection.filePath) {
      return { filePath: '', canceled: true };
    }

    const filePath = await exportInvoicePdf(invoice, path.dirname(selection.filePath), selection.filePath);
    return { filePath, canceled: false };
  });

  ipcMain.handle('payments:list', () => dbApi.listPayments());
  ipcMain.handle('payments:save', (_event, payload) => dbApi.upsertPayment(payload));
  ipcMain.handle('payments:delete', (_event, id) => dbApi.deletePayment(id));

  ipcMain.handle('system:backupDatabase', () => {
    const source = path.join(app.getPath('userData'), 'appmana.db');
    const backupDir = path.join(app.getPath('documents'), 'WorkOrbit Backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `appmana-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
    fs.copyFileSync(source, backupFile);
    return { backupFile };
  });
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.fmp.freelance');
  }
  runtimeLogPath = path.join(app.getPath('userData'), 'runtime.log');
  writeRuntimeLog('app-ready', `runtime-log=${runtimeLogPath}`);
  dbApi.initDatabase(app.getPath('userData'));
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

process.on('uncaughtException', (error) => {
  writeRuntimeLog('uncaughtException', error?.stack || String(error));
  openDebugTools('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  const details = reason && reason.stack ? reason.stack : String(reason);
  writeRuntimeLog('unhandledRejection', details);
  openDebugTools('unhandledRejection');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
