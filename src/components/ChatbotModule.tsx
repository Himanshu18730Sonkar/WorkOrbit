import { useState } from 'react';
import type { AppData } from '../types';

type ChatMessage = {
  id: number;
  role: 'user' | 'bot';
  text: string;
};

type Props = {
  data: AppData;
};

function getBotReply(input: string, data: AppData) {
  const query = input.trim().toLowerCase();

  if (!query) {
    return 'Ask me anything about your freelance business operations.';
  }

  if (query.includes('help') || query.includes('what can you do')) {
    return 'I can summarize your business, check overdue invoices, pending payments, upcoming deadlines, follow-ups, project status, and income trends. Try: "summary", "overdue invoices", "deadlines", "follow-ups", "income".';
  }

  if (query.includes('summary') || query.includes('overview')) {
    return `Business snapshot: ${data.clients.length} clients, ${data.leads.length} leads, ${data.projects.length} projects, ${data.tasks.length} tasks, ${data.invoices.length} invoices, ${data.payments.length} payment records. Active projects: ${data.dashboard.activeProjects}. Pending payments: $${Number(data.dashboard.pendingPayments || 0).toFixed(2)}. Overdue invoices: ${data.dashboard.overdueInvoices}.`;
  }

  if (query.includes('overdue invoice') || query.includes('overdue payment')) {
    const overdue = data.invoices.filter((invoice) => invoice.is_overdue);
    if (!overdue.length) {
      return 'Great news: you have no overdue invoices right now.';
    }
    const lines = overdue.slice(0, 5).map((invoice) => `${invoice.invoice_number || 'N/A'} (${invoice.client_name || 'Unknown client'}) ${invoice.currency} ${invoice.amount.toFixed(2)} due ${invoice.due_date}`);
    return `You have ${overdue.length} overdue invoice(s): ${lines.join(' | ')}`;
  }

  if (query.includes('pending') && query.includes('payment')) {
    const pending = data.payments.filter((payment) => payment.status === 'Pending' || payment.status === 'Partially Paid' || payment.status === 'Overdue');
    const totalPending = pending.reduce((sum, row) => sum + Number(row.pending_balance || 0), 0);
    return `Pending collection: ${pending.length} record(s), total outstanding $${totalPending.toFixed(2)}.`;
  }

  if (query.includes('deadline') || query.includes('due this week')) {
    if (!data.dashboard.upcomingDeadlines.length) {
      return 'No upcoming active project deadlines are currently recorded.';
    }
    const lines = data.dashboard.upcomingDeadlines.slice(0, 5).map((entry) => `${entry.title} (${entry.client_name || 'No client'}) on ${entry.deadline}`);
    return `Upcoming deadlines: ${lines.join(' | ')}`;
  }

  if (query.includes('follow') || query.includes('lead reminder') || query.includes('outreach')) {
    if (!data.dashboard.followUps.length) {
      return 'No lead follow-up reminders are currently due.';
    }
    const lines = data.dashboard.followUps.slice(0, 6).map((lead) => `${lead.name} on ${lead.follow_up_date} (${lead.status})`);
    return `Lead follow-ups to prioritize: ${lines.join(' | ')}`;
  }

  if (query.includes('income') || query.includes('month')) {
    if (!data.dashboard.incomeByMonth.length) {
      return 'No monthly income data yet. Add payment entries with payment dates to generate trends.';
    }
    const rows = data.dashboard.incomeByMonth.slice(0, 6).map((entry) => `${entry.month}: $${Number(entry.amount).toFixed(2)}`);
    return `Recent monthly income: ${rows.join(' | ')}`;
  }

  if (query.includes('project') && query.includes('status')) {
    const active = data.projects.filter((project) => project.status === 'Active').length;
    const done = data.projects.filter((project) => project.status === 'Completed').length;
    const hold = data.projects.filter((project) => project.status === 'On Hold').length;
    return `Project status distribution — Active: ${active}, Completed: ${done}, On Hold: ${hold}.`;
  }

  return 'I did not fully understand that. Try: "summary", "overdue invoices", "pending payments", "deadlines", "follow-ups", "income", or "project status".';
}

export function ChatbotModule({ data }: Props) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'bot',
      text: 'Hi, I am your WorkOrbit Assistant. Ask me for a summary, overdue invoices, pending payments, deadlines, follow-ups, income, or project status.'
    }
  ]);

  function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = { id: Date.now(), role: 'user', text: trimmed };
    const botMessage: ChatMessage = { id: Date.now() + 1, role: 'bot', text: getBotReply(trimmed, data) };

    setMessages((previous) => [...previous, userMessage, botMessage]);
    setInput('');
  }

  return (
    <section className="card chatbot-card">
      <div className="row space-between">
        <h3>WorkOrbit Assistant</h3>
        <small>Offline business assistant</small>
      </div>

      <div className="chat-stream">
        {messages.map((message) => (
          <div key={message.id} className={`chat-msg ${message.role}`}>
            <strong>{message.role === 'user' ? 'You' : 'Assistant'}</strong>
            <p>{message.text}</p>
          </div>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          placeholder="Ask: summary, overdue invoices, pending payments..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              sendMessage();
            }
          }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </section>
  );
}
