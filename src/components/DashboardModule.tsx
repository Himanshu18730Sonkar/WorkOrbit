import type { DashboardData } from '../types';

type Props = {
  data: DashboardData;
  onQuickAction: (target: string) => void;
};

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed);
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

export function DashboardModule({ data, onQuickAction }: Props) {
  const incomeSeries = data.incomeByMonth.slice(-6);
  const maxIncome = Math.max(1, ...incomeSeries.map((entry) => Number(entry.amount || 0)));

  const workloadSeries = [
    { label: 'Active Projects', value: data.activeProjects },
    { label: 'Overdue Invoices', value: data.overdueInvoices },
    { label: 'Follow-ups', value: data.followUps.length },
    { label: 'Urgent Reminders', value: data.reminders.length }
  ];
  const maxWorkload = Math.max(1, ...workloadSeries.map((entry) => entry.value));

  return (
    <div className="module-grid">
      <section className="stats-grid">
        <article className="card stat">
          <h3>Active Projects</h3>
          <p>{data.activeProjects}</p>
        </article>
        <article className="card stat">
          <h3>Pending Tasks</h3>
          <p>{data.pendingTasks}</p>
        </article>
        <article className="card stat">
          <h3>Pending Payments</h3>
          <p>{currency.format(data.pendingPayments)}</p>
        </article>
        <article className="card stat">
          <h3>Overdue Invoices</h3>
          <p>{data.overdueInvoices}</p>
        </article>
      </section>

      <section className="chart-grid">
        <article className="card chart-card">
          <div className="card-heading">
            <h3>Income Trend (Last 6 Months)</h3>
            <small>Monthly received amount</small>
          </div>
          {incomeSeries.length === 0 ? (
            <p className="empty-note">No income data available yet.</p>
          ) : (
            <ul className="chart-list" aria-label="Monthly income bar chart">
              {incomeSeries.map((entry) => {
                const amount = Number(entry.amount || 0);
                const widthPercent = Math.max(4, Math.round((amount / maxIncome) * 100));
                return (
                  <li key={entry.month} className="chart-row">
                    <div className="chart-labels">
                      <span>{entry.month}</span>
                      <strong>{currency.format(amount)}</strong>
                    </div>
                    <div className="chart-track">
                      <div className="chart-fill income" style={{ width: `${widthPercent}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="card chart-card">
          <div className="card-heading">
            <h3>Workload Snapshot</h3>
            <small>Current open workload indicators</small>
          </div>
          <ul className="chart-list" aria-label="Workload indicator chart">
            {workloadSeries.map((entry) => {
              const widthPercent = Math.max(8, Math.round((entry.value / maxWorkload) * 100));
              return (
                <li key={entry.label} className="chart-row">
                  <div className="chart-labels">
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </div>
                  <div className="chart-track">
                    <div className="chart-fill workload" style={{ width: `${widthPercent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      </section>

      <section className="card">
        <h3>Quick Actions</h3>
        <div className="actions-row">
          <button onClick={() => onQuickAction('clients')}>Add Client</button>
          <button onClick={() => onQuickAction('leads')}>Add Lead</button>
          <button onClick={() => onQuickAction('projects')}>Add Project</button>
          <button onClick={() => onQuickAction('invoices')}>Create Invoice</button>
          <button onClick={() => onQuickAction('tasks')}>Add Task</button>
        </div>
      </section>

      <section className="card split">
        <div>
          <h3>Upcoming Deadlines</h3>
          <ul className="list compact">
            {data.upcomingDeadlines.length === 0 && <li>No upcoming deadlines.</li>}
            {data.upcomingDeadlines.map((item) => (
              <li key={item.id} className="list-item">
                <span>{item.title} {item.client_name ? `(${item.client_name})` : ''}</span>
                <small>{formatDate(item.deadline)}</small>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Follow-up Reminders</h3>
          <ul className="list compact">
            {data.followUps.length === 0 && <li>No follow-up reminders.</li>}
            {data.followUps.map((item) => (
              <li key={item.id} className="list-item">
                <span>{item.name}</span>
                <small>{formatDate(item.follow_up_date)} • {item.status}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card split">
        <div>
          <h3>Pending Tasks To Complete</h3>
          <ul className="list compact">
            {data.pendingTaskItems.length === 0 && <li>No pending tasks right now.</li>}
            {data.pendingTaskItems.map((item) => (
              <li key={item.id} className="list-item">
                <span>{item.title} {item.project_title ? `(${item.project_title})` : ''}</span>
                <small>{item.priority} • {item.status}{item.due_date ? ` • Due ${formatDate(item.due_date)}` : ''}</small>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Recent Activity</h3>
          <ul className="list compact">
            {data.recentActivity.length === 0 && <li>No activity yet.</li>}
            {data.recentActivity.map((item) => (
              <li key={item.id} className="list-item">
                <span>{item.message}</span>
                <small>{formatDateTime(item.created_at)}</small>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Reminders (5-day window)</h3>
          <ul className="list compact">
            {data.reminders.length === 0 && <li>No urgent reminders.</li>}
            {data.reminders.map((item, index) => (
              <li key={`${item.type}-${index}`} className="list-item">
                <span>{item.type}: {item.title}</span>
                <small>{formatDate(item.date)}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <h3>Monthly Income Summary</h3>
        <ul className="list compact horizontal">
          {data.incomeByMonth.length === 0 && <li>No income data yet.</li>}
          {data.incomeByMonth.map((entry) => (
            <li key={entry.month}>{entry.month}: {currency.format(Number(entry.amount || 0))}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
