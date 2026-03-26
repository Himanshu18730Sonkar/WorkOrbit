const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getDashboard: () => ipcRenderer.invoke('dashboard:get'),

  listClients: (query) => ipcRenderer.invoke('clients:list', query),
  saveClient: (payload) => ipcRenderer.invoke('clients:save', payload),
  deleteClient: (id) => ipcRenderer.invoke('clients:delete', id),

  listLeads: () => ipcRenderer.invoke('leads:list'),
  saveLead: (payload) => ipcRenderer.invoke('leads:save', payload),
  deleteLead: (id) => ipcRenderer.invoke('leads:delete', id),

  listProjects: () => ipcRenderer.invoke('projects:list'),
  saveProject: (payload) => ipcRenderer.invoke('projects:save', payload),
  deleteProject: (id) => ipcRenderer.invoke('projects:delete', id),

  listTasks: () => ipcRenderer.invoke('tasks:list'),
  saveTask: (payload) => ipcRenderer.invoke('tasks:save', payload),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),

  listInvoices: () => ipcRenderer.invoke('invoices:list'),
  saveInvoice: (payload) => ipcRenderer.invoke('invoices:save', payload),
  deleteInvoice: (id) => ipcRenderer.invoke('invoices:delete', id),
  markInvoicePaid: (id) => ipcRenderer.invoke('invoices:markPaid', id),
  listInvoiceTemplates: () => ipcRenderer.invoke('invoiceTemplates:list'),
  saveInvoiceTemplate: (payload) => ipcRenderer.invoke('invoiceTemplates:save', payload),
  deleteInvoiceTemplate: (id) => ipcRenderer.invoke('invoiceTemplates:delete', id),
  exportInvoicePdf: (id) => ipcRenderer.invoke('invoices:exportPdf', id),

  listPayments: () => ipcRenderer.invoke('payments:list'),
  savePayment: (payload) => ipcRenderer.invoke('payments:save', payload),
  deletePayment: (id) => ipcRenderer.invoke('payments:delete', id),

  backupDatabase: () => ipcRenderer.invoke('system:backupDatabase')
});
