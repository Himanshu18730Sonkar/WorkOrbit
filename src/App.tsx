import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAllData } from './api';
import { ClientsModule } from './components/ClientsModule';
import { ChatbotModule } from './components/ChatbotModule';
import { DashboardModule } from './components/DashboardModule';
import { InvoicesModule } from './components/InvoicesModule';
import { LeadsModule } from './components/LeadsModule';
import { PaymentsModule } from './components/PaymentsModule';
import { ProjectsModule } from './components/ProjectsModule';
import { TasksModule } from './components/TasksModule';
import type { AppData, Client, Invoice, Lead, Payment, Project, Task } from './types';

type TabKey = 'dashboard' | 'clients' | 'leads' | 'projects' | 'tasks' | 'invoices' | 'payments' | 'chatbot';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'clients', label: 'Clients' },
  { key: 'leads', label: 'Leads / Outreach' },
  { key: 'projects', label: 'Projects' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payments' },
  { key: 'chatbot', label: 'Chatbot' }
];

const initialData: AppData = {
  clients: [],
  leads: [],
  projects: [],
  tasks: [],
  invoices: [],
  payments: [],
  dashboard: {
    activeProjects: 0,
    pendingPayments: 0,
    pendingTasks: 0,
    overdueInvoices: 0,
    upcomingDeadlines: [],
    followUps: [],
    recentActivity: [],
    pendingTaskItems: [],
    reminders: [],
    incomeByMonth: []
  }
};

const brandLogoSrc = `${import.meta.env.BASE_URL}applogo.svg`;

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [data, setData] = useState<AppData>(initialData);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchAllData();
      setData(payload);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setActiveTab('dashboard');
      }
      if (event.altKey && event.key === '1') setActiveTab('clients');
      if (event.altKey && event.key === '2') setActiveTab('leads');
      if (event.altKey && event.key === '3') setActiveTab('projects');
      if (event.altKey && event.key === '4') setActiveTab('tasks');
      if (event.altKey && event.key === '5') setActiveTab('invoices');
      if (event.altKey && event.key === '6') setActiveTab('payments');
      if (event.altKey && event.key === '7') setActiveTab('chatbot');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handlers = useMemo(() => ({
    clients: {
      save: async (payload: Client) => { await window.api.saveClient(payload); await refreshAll(); },
      remove: async (id: number) => { await window.api.deleteClient(id); await refreshAll(); }
    },
    leads: {
      save: async (payload: Lead) => { await window.api.saveLead(payload); await refreshAll(); },
      remove: async (id: number) => { await window.api.deleteLead(id); await refreshAll(); }
    },
    projects: {
      save: async (payload: Project) => { await window.api.saveProject(payload); await refreshAll(); },
      remove: async (id: number) => { await window.api.deleteProject(id); await refreshAll(); }
    },
    tasks: {
      save: async (payload: Task) => { await window.api.saveTask(payload); await refreshAll(); },
      remove: async (id: number) => { await window.api.deleteTask(id); await refreshAll(); }
    },
    invoices: {
      save: async (payload: Invoice) => { await window.api.saveInvoice(payload); await refreshAll(); },
      remove: async (id: number) => { await window.api.deleteInvoice(id); await refreshAll(); },
      markPaid: async (id: number) => { await window.api.markInvoicePaid(id); await refreshAll(); },
      exportPdf: async (id: number) => {
        try {
          const result = await window.api.exportInvoicePdf(id);
          if (result.canceled) {
            return;
          }
          showMessage(`Invoice PDF exported: ${result.filePath}`);
        } catch (error) {
          const messageText = error instanceof Error ? error.message : String(error);
          if (!/canceled/i.test(messageText)) {
            showMessage('PDF export failed. Please try again.');
          }
        }
      }
    },
    payments: {
      save: async (payload: Payment) => { await window.api.savePayment(payload); await refreshAll(); },
      remove: async (id: number) => { await window.api.deletePayment(id); await refreshAll(); }
    }
  }), [refreshAll, showMessage]);

  if (loading) {
    return (
      <div className="loading-screen">
        <img src={brandLogoSrc} alt="WorkOrbit logo" className="loading-logo" />
        <h2>WorkOrbit</h2>
        <p>Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className={`shell ${darkMode ? 'dark' : ''}`}>
      <aside className="sidebar">
        <div className="brand-row">
          <img src={brandLogoSrc} alt="WorkOrbit logo" className="brand-logo" />
          <h1>WorkOrbit</h1>
        </div>
        <p>Freelance Business Manager</p>
        <nav>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab(tab.key)}
              title={`Open ${tab.label}`}
              aria-label={`Open ${tab.label}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            onClick={() => setDarkMode((value) => !value)}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={async () => {
            const result = await window.api.backupDatabase();
            showMessage(`Backup saved: ${result.backupFile}`);
          }} title="Create a backup copy of your database">Backup Data</button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h2>{tabs.find((tab) => tab.key === activeTab)?.label}</h2>
            <small>Keyboard: Alt+1..7 modules, Ctrl+K dashboard</small>
          </div>
          {message && <div className="toast">{message}</div>}
        </header>

        {activeTab === 'dashboard' && <DashboardModule data={data.dashboard} onQuickAction={(target) => setActiveTab(target as TabKey)} />}
        {activeTab === 'clients' && <ClientsModule clients={data.clients} onSave={handlers.clients.save} onDelete={handlers.clients.remove} />}
        {activeTab === 'leads' && <LeadsModule leads={data.leads} onSave={handlers.leads.save} onDelete={handlers.leads.remove} />}
        {activeTab === 'projects' && <ProjectsModule clients={data.clients} projects={data.projects} onSave={handlers.projects.save} onDelete={handlers.projects.remove} />}
        {activeTab === 'tasks' && <TasksModule projects={data.projects} tasks={data.tasks} onSave={handlers.tasks.save} onDelete={handlers.tasks.remove} />}
        {activeTab === 'invoices' && (
          <InvoicesModule
            clients={data.clients}
            projects={data.projects}
            invoices={data.invoices}
            onSave={handlers.invoices.save}
            onDelete={handlers.invoices.remove}
            onMarkPaid={handlers.invoices.markPaid}
            onExportPdf={handlers.invoices.exportPdf}
          />
        )}
        {activeTab === 'payments' && (
          <PaymentsModule
            projects={data.projects}
            invoices={data.invoices}
            payments={data.payments}
            onSave={handlers.payments.save}
            onDelete={handlers.payments.remove}
          />
        )}
        {activeTab === 'chatbot' && <ChatbotModule data={data} />}
      </main>
    </div>
  );
}

export default App;
