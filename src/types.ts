export type Client = {
  id?: number;
  name: string;
  company?: string;
  email?: string;
  contact_type?: 'Email' | 'Phone' | 'WhatsApp' | 'LinkedIn' | 'Telegram' | 'Other';
  contact_value?: string;
  country: string;
  notes?: string;
  created_at?: string;
  project_count?: number;
  total_received?: number;
};

export type LeadStatus = 'Not Contacted' | 'Contacted' | 'Replied' | 'Interested' | 'Closed' | 'No Response';

export type Lead = {
  id?: number;
  name: string;
  source: string;
  method: 'Email' | 'WhatsApp' | 'LinkedIn' | 'Phone' | 'Other';
  date_contacted?: string;
  status: LeadStatus;
  follow_up_date?: string;
  notes?: string;
};

export type Project = {
  id?: number;
  client_id?: number;
  client_name?: string;
  title: string;
  description?: string;
  status: 'Active' | 'Completed' | 'On Hold';
  budget: number;
  start_date?: string;
  deadline?: string;
  task_count?: number;
  amount_received?: number;
  amount_invoiced?: number;
};

export type Task = {
  id?: number;
  project_id: number;
  project_title?: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Done';
  due_date?: string;
  priority: 'High' | 'Medium' | 'Low';
};

export type Invoice = {
  id?: number;
  project_id?: number;
  client_id?: number;
  client_name?: string;
  project_title?: string;
  invoice_number?: string;
  service_description: string;
  amount: number;
  currency: string;
  payment_terms?: string;
  issue_date: string;
  due_date: string;
  status: 'Unpaid' | 'Paid';
  document_html?: string;
  paid_date?: string;
  is_overdue?: number;
};

export type InvoiceTemplateDoc = {
  id?: number;
  name: string;
  content_html: string;
  created_at?: string;
  updated_at?: string;
};

export type Payment = {
  id?: number;
  project_id?: number;
  project_title?: string;
  invoice_id?: number;
  invoice_number?: string;
  agreed_value: number;
  amount_invoiced: number;
  amount_received: number;
  pending_balance: number;
  payment_method: string;
  payment_date?: string;
  status: 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue';
  notes?: string;
};

export type DashboardData = {
  activeProjects: number;
  pendingPayments: number;
  pendingTasks: number;
  overdueInvoices: number;
  upcomingDeadlines: { id: number; title: string; deadline: string; client_name?: string }[];
  followUps: { id: number; name: string; follow_up_date: string; status: string }[];
  recentActivity: { id: number; message: string; created_at: string }[];
  pendingTaskItems: { id: number; title: string; status: string; priority: string; due_date?: string; project_title?: string }[];
  reminders: { type: string; title: string; date: string }[];
  incomeByMonth: { month: string; amount: number }[];
};

export type AppData = {
  clients: Client[];
  leads: Lead[];
  projects: Project[];
  tasks: Task[];
  invoices: Invoice[];
  payments: Payment[];
  dashboard: DashboardData;
};
