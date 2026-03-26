import type { Client, DashboardData, Invoice, InvoiceTemplateDoc, Lead, Payment, Project, Task } from './types';

declare global {
  interface Window {
    api: {
      getDashboard: () => Promise<DashboardData>;
      listClients: (query?: { search?: string; sortBy?: string }) => Promise<Client[]>;
      saveClient: (payload: Client) => Promise<number>;
      deleteClient: (id: number) => Promise<void>;
      listLeads: () => Promise<Lead[]>;
      saveLead: (payload: Lead) => Promise<number>;
      deleteLead: (id: number) => Promise<void>;
      listProjects: () => Promise<Project[]>;
      saveProject: (payload: Project) => Promise<number>;
      deleteProject: (id: number) => Promise<void>;
      listTasks: () => Promise<Task[]>;
      saveTask: (payload: Task) => Promise<number>;
      deleteTask: (id: number) => Promise<void>;
      listInvoices: () => Promise<Invoice[]>;
      saveInvoice: (payload: Invoice) => Promise<number>;
      deleteInvoice: (id: number) => Promise<void>;
      markInvoicePaid: (id: number) => Promise<void>;
      listInvoiceTemplates: () => Promise<InvoiceTemplateDoc[]>;
      saveInvoiceTemplate: (payload: InvoiceTemplateDoc) => Promise<number>;
      deleteInvoiceTemplate: (id: number) => Promise<void>;
      exportInvoicePdf: (id: number) => Promise<{ filePath: string; canceled?: boolean }>;
      listPayments: () => Promise<Payment[]>;
      savePayment: (payload: Payment) => Promise<number>;
      deletePayment: (id: number) => Promise<void>;
      backupDatabase: () => Promise<{ backupFile: string }>;
    };
  }
}

export async function fetchAllData() {
  const [clients, leads, projects, tasks, invoices, payments, dashboard] = await Promise.all([
    window.api.listClients(),
    window.api.listLeads(),
    window.api.listProjects(),
    window.api.listTasks(),
    window.api.listInvoices(),
    window.api.listPayments(),
    window.api.getDashboard()
  ]);

  return { clients, leads, projects, tasks, invoices, payments, dashboard };
}
