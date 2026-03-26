const path = require('path');
const Database = require('better-sqlite3');

let db;

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function initDatabase(userDataPath) {
  const dbPath = path.join(userDataPath, 'appmana.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createSchema();
  seedDefaults();
  return db;
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT NOT NULL,
      country TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      method TEXT NOT NULL,
      date_contacted TEXT,
      status TEXT NOT NULL,
      follow_up_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      budget REAL NOT NULL DEFAULT 0,
      start_date TEXT,
      deadline TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      due_date TEXT,
      priority TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      client_id INTEGER,
      invoice_number TEXT UNIQUE NOT NULL,
      service_description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      payment_terms TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL,
      paid_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS invoice_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content_html TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      invoice_id INTEGER,
      agreed_value REAL NOT NULL DEFAULT 0,
      amount_invoiced REAL NOT NULL DEFAULT 0,
      amount_received REAL NOT NULL DEFAULT 0,
      pending_balance REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL,
      payment_date TEXT,
      status TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureColumn('clients', 'contact_type', "TEXT NOT NULL DEFAULT 'Email'");
  ensureColumn('clients', 'contact_value', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('invoices', 'document_html', "TEXT NOT NULL DEFAULT ''");
}

function seedDefaults() {
  const count = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  if (count === 0) {
    db.prepare(
      `INSERT INTO leads (name, source, method, date_contacted, status, follow_up_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('Sample Lead', 'Instagram', 'Email', new Date().toISOString().slice(0, 10), 'Contacted', new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), 'Initial outreach done.');
  }
}

function recordActivity(message) {
  db.prepare('INSERT INTO activity_log (message) VALUES (?)').run(message);
}

function generateInvoiceNumber() {
  const row = db.prepare(`
    SELECT invoice_number FROM invoices
    WHERE invoice_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(`INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-%`);

  const prefix = `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-`;
  let next = 1;
  if (row?.invoice_number) {
    const parts = row.invoice_number.split('-');
    const current = Number(parts[2] || 0);
    next = current + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

function listClients(search = '', sortBy = 'name') {
  const sortClauses = {
    name: 'c.name COLLATE NOCASE ASC',
    recent: 'datetime(c.created_at) DESC',
    oldest: 'datetime(c.created_at) ASC',
    received: 'total_received DESC'
  };
  const safeSort = sortClauses[sortBy] || sortClauses.name;

  return db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) AS project_count,
      COALESCE((SELECT SUM(amount_received) FROM payments pm
        LEFT JOIN projects p2 ON p2.id = pm.project_id
        WHERE p2.client_id = c.id), 0) AS total_received
    FROM clients c
    WHERE c.name LIKE @term
      OR c.email LIKE @term
      OR c.company LIKE @term
      OR c.country LIKE @term
      OR c.contact_type LIKE @term
      OR c.contact_value LIKE @term
    ORDER BY ${safeSort}
  `).all({ term: `%${search}%` });
}

function upsertClient(payload) {
  const email = payload.email || '';
  const contactType = payload.contact_type || (email ? 'Email' : 'Phone');
  const contactValue = payload.contact_value || email;

  if (payload.id) {
    db.prepare(`
      UPDATE clients
      SET name=?, company=?, email=?, country=?, notes=?, contact_type=?, contact_value=?
      WHERE id=?
    `).run(payload.name, payload.company || '', email, payload.country, payload.notes || '', contactType, contactValue, payload.id);
    recordActivity(`Client updated: ${payload.name}`);
    return payload.id;
  }
  const result = db.prepare(`
    INSERT INTO clients (name, company, email, country, notes, contact_type, contact_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(payload.name, payload.company || '', email, payload.country, payload.notes || '', contactType, contactValue);
  recordActivity(`Client added: ${payload.name}`);
  return result.lastInsertRowid;
}

function deleteClient(id) {
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  recordActivity('Client deleted');
}

function listLeads() {
  return db.prepare('SELECT * FROM leads ORDER BY COALESCE(follow_up_date, date_contacted) ASC, id DESC').all();
}

function upsertLead(payload) {
  if (payload.id) {
    db.prepare(`
      UPDATE leads SET name=?, source=?, method=?, date_contacted=?, status=?, follow_up_date=?, notes=? WHERE id=?
    `).run(payload.name, payload.source, payload.method, payload.date_contacted || null, payload.status, payload.follow_up_date || null, payload.notes || '', payload.id);
    recordActivity(`Lead updated: ${payload.name}`);
    return payload.id;
  }
  const result = db.prepare(`
    INSERT INTO leads (name, source, method, date_contacted, status, follow_up_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(payload.name, payload.source, payload.method, payload.date_contacted || null, payload.status, payload.follow_up_date || null, payload.notes || '');
  recordActivity(`Lead added: ${payload.name}`);
  return result.lastInsertRowid;
}

function deleteLead(id) {
  db.prepare('DELETE FROM leads WHERE id=?').run(id);
  recordActivity('Lead deleted');
}

function listProjects() {
  return db.prepare(`
    SELECT p.*, c.name AS client_name,
      COALESCE((SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id), 0) AS task_count,
      COALESCE((SELECT SUM(amount_received) FROM payments pm WHERE pm.project_id = p.id), 0) AS amount_received,
      COALESCE((SELECT SUM(amount) FROM invoices i WHERE i.project_id = p.id), 0) AS amount_invoiced
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    ORDER BY COALESCE(p.deadline, p.start_date, p.created_at) ASC
  `).all();
}

function upsertProject(payload) {
  if (payload.id) {
    db.prepare(`
      UPDATE projects SET client_id=?, title=?, description=?, status=?, budget=?, start_date=?, deadline=? WHERE id=?
    `).run(payload.client_id || null, payload.title, payload.description || '', payload.status, Number(payload.budget || 0), payload.start_date || null, payload.deadline || null, payload.id);
    recordActivity(`Project updated: ${payload.title}`);
    return payload.id;
  }
  const result = db.prepare(`
    INSERT INTO projects (client_id, title, description, status, budget, start_date, deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(payload.client_id || null, payload.title, payload.description || '', payload.status, Number(payload.budget || 0), payload.start_date || null, payload.deadline || null);
  recordActivity(`Project added: ${payload.title}`);
  return result.lastInsertRowid;
}

function deleteProject(id) {
  db.prepare('DELETE FROM projects WHERE id=?').run(id);
  recordActivity('Project deleted');
}

function listTasks() {
  return db.prepare(`
    SELECT t.*, p.title AS project_title
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    ORDER BY CASE t.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
             COALESCE(t.due_date, t.created_at) ASC
  `).all();
}

function upsertTask(payload) {
  if (payload.id) {
    db.prepare(`
      UPDATE tasks SET project_id=?, title=?, status=?, due_date=?, priority=? WHERE id=?
    `).run(payload.project_id, payload.title, payload.status, payload.due_date || null, payload.priority, payload.id);
    recordActivity(`Task updated: ${payload.title}`);
    return payload.id;
  }
  const result = db.prepare(`
    INSERT INTO tasks (project_id, title, status, due_date, priority) VALUES (?, ?, ?, ?, ?)
  `).run(payload.project_id, payload.title, payload.status, payload.due_date || null, payload.priority);
  recordActivity(`Task added: ${payload.title}`);
  return result.lastInsertRowid;
}

function deleteTask(id) {
  db.prepare('DELETE FROM tasks WHERE id=?').run(id);
  recordActivity('Task deleted');
}

function listInvoices() {
  return db.prepare(`
    SELECT i.*, c.name AS client_name, p.title AS project_title,
      CASE
        WHEN i.status = 'Paid' THEN 0
        WHEN date(i.due_date) < date('now') THEN 1
        ELSE 0
      END AS is_overdue
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    LEFT JOIN projects p ON p.id = i.project_id
    ORDER BY date(i.due_date) ASC
  `).all();
}

function upsertInvoice(payload) {
  const number = payload.invoice_number || generateInvoiceNumber();
  if (payload.id) {
    db.prepare(`
      UPDATE invoices
      SET project_id=?, client_id=?, invoice_number=?, service_description=?, amount=?, currency=?, payment_terms=?, issue_date=?, due_date=?, status=?, document_html=?, paid_date=?
      WHERE id=?
    `).run(
      payload.project_id || null,
      payload.client_id || null,
      number,
      payload.service_description,
      Number(payload.amount || 0),
      payload.currency,
      payload.payment_terms || '',
      payload.issue_date,
      payload.due_date,
      payload.status,
      payload.document_html || '',
      payload.paid_date || null,
      payload.id
    );
    recordActivity(`Invoice updated: ${number}`);
    return payload.id;
  }
  const result = db.prepare(`
    INSERT INTO invoices (project_id, client_id, invoice_number, service_description, amount, currency, payment_terms, issue_date, due_date, status, document_html, paid_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payload.project_id || null,
    payload.client_id || null,
    number,
    payload.service_description,
    Number(payload.amount || 0),
    payload.currency,
    payload.payment_terms || '',
    payload.issue_date,
    payload.due_date,
    payload.status || 'Unpaid',
    payload.document_html || '',
    payload.paid_date || null
  );
  recordActivity(`Invoice created: ${number}`);
  return result.lastInsertRowid;
}

function deleteInvoice(id) {
  db.prepare('DELETE FROM invoices WHERE id=?').run(id);
  recordActivity('Invoice deleted');
}

function markInvoicePaid(id) {
  db.prepare(`UPDATE invoices SET status='Paid', paid_date=date('now') WHERE id=?`).run(id);
  recordActivity('Invoice marked paid');
}

function listInvoiceTemplates() {
  return db.prepare(`
    SELECT *
    FROM invoice_templates
    ORDER BY datetime(updated_at) DESC, id DESC
  `).all();
}

function upsertInvoiceTemplate(payload) {
  const safeName = String(payload.name || '').trim() || 'Untitled Invoice Template';
  const safeContent = String(payload.content_html || '').trim();

  if (payload.id) {
    db.prepare(`
      UPDATE invoice_templates
      SET name=?, content_html=?, updated_at=datetime('now')
      WHERE id=?
    `).run(safeName, safeContent, payload.id);
    recordActivity(`Invoice template updated: ${safeName}`);
    return payload.id;
  }

  const result = db.prepare(`
    INSERT INTO invoice_templates (name, content_html)
    VALUES (?, ?)
  `).run(safeName, safeContent);
  recordActivity(`Invoice template created: ${safeName}`);
  return result.lastInsertRowid;
}

function deleteInvoiceTemplate(id) {
  db.prepare('DELETE FROM invoice_templates WHERE id=?').run(id);
  recordActivity('Invoice template deleted');
}

function listPayments() {
  return db.prepare(`
    SELECT pm.*, p.title AS project_title, i.invoice_number
    FROM payments pm
    LEFT JOIN projects p ON p.id = pm.project_id
    LEFT JOIN invoices i ON i.id = pm.invoice_id
    ORDER BY COALESCE(pm.payment_date, pm.created_at) DESC
  `).all();
}

function upsertPayment(payload) {
  if (payload.id) {
    db.prepare(`
      UPDATE payments
      SET project_id=?, invoice_id=?, agreed_value=?, amount_invoiced=?, amount_received=?, pending_balance=?, payment_method=?, payment_date=?, status=?, notes=?
      WHERE id=?
    `).run(
      payload.project_id || null,
      payload.invoice_id || null,
      Number(payload.agreed_value || 0),
      Number(payload.amount_invoiced || 0),
      Number(payload.amount_received || 0),
      Number(payload.pending_balance || 0),
      payload.payment_method,
      payload.payment_date || null,
      payload.status,
      payload.notes || '',
      payload.id
    );
    recordActivity('Payment updated');
    return payload.id;
  }
  const result = db.prepare(`
    INSERT INTO payments (project_id, invoice_id, agreed_value, amount_invoiced, amount_received, pending_balance, payment_method, payment_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payload.project_id || null,
    payload.invoice_id || null,
    Number(payload.agreed_value || 0),
    Number(payload.amount_invoiced || 0),
    Number(payload.amount_received || 0),
    Number(payload.pending_balance || 0),
    payload.payment_method,
    payload.payment_date || null,
    payload.status,
    payload.notes || ''
  );
  recordActivity('Payment added');
  return result.lastInsertRowid;
}

function deletePayment(id) {
  db.prepare('DELETE FROM payments WHERE id=?').run(id);
  recordActivity('Payment deleted');
}

function getInvoiceById(id) {
  return db.prepare(`
    SELECT i.*, c.name AS client_name, c.email AS client_email, c.company AS client_company, c.country AS client_country
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ?
  `).get(id);
}

function getDashboard() {
  const activeProjects = db.prepare(`SELECT COUNT(*) as count FROM projects WHERE status='Active'`).get().count;
  const pendingPayments = db.prepare(`SELECT COALESCE(SUM(pending_balance), 0) AS total FROM payments WHERE status IN ('Pending','Partially Paid','Overdue')`).get().total;
  const pendingTasks = db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE status IN ('Pending', 'In Progress')`).get().count;
  const overdueInvoices = db.prepare(`
    SELECT COUNT(*) as count
    FROM invoices
    WHERE status != 'Paid' AND date(due_date) < date('now')
  `).get().count;
  const upcomingDeadlines = db.prepare(`
    SELECT p.id, p.title, p.deadline, c.name as client_name
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.status = 'Active' AND p.deadline IS NOT NULL AND date(p.deadline) >= date('now')
    ORDER BY date(p.deadline) ASC
    LIMIT 5
  `).all();
  const followUps = db.prepare(`
    SELECT id, name, follow_up_date, status
    FROM leads
    WHERE follow_up_date IS NOT NULL AND date(follow_up_date) <= date('now', '+7 day')
    ORDER BY date(follow_up_date) ASC
    LIMIT 7
  `).all();
  const recentActivity = db.prepare(`SELECT * FROM activity_log ORDER BY id DESC LIMIT 10`).all();

  const pendingTaskItems = db.prepare(`
    SELECT t.id, t.title, t.status, t.priority, t.due_date, p.title as project_title
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.status IN ('Pending', 'In Progress')
    ORDER BY
      CASE t.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
      COALESCE(date(t.due_date), date('2999-12-31')) ASC
    LIMIT 6
  `).all();

  const reminders = [
    ...db.prepare(`
      SELECT 'Invoice Due' as type, invoice_number as title, due_date as date
      FROM invoices
      WHERE status != 'Paid' AND due_date IS NOT NULL AND date(due_date) <= date('now', '+5 day')
      ORDER BY date(due_date) ASC
      LIMIT 5
    `).all(),
    ...db.prepare(`
      SELECT 'Project Deadline' as type, title, deadline as date
      FROM projects
      WHERE status = 'Active' AND deadline IS NOT NULL AND date(deadline) <= date('now', '+5 day')
      ORDER BY date(deadline) ASC
      LIMIT 5
    `).all(),
    ...db.prepare(`
      SELECT 'Lead Follow-up' as type, name as title, follow_up_date as date
      FROM leads
      WHERE follow_up_date IS NOT NULL AND date(follow_up_date) <= date('now', '+5 day')
      ORDER BY date(follow_up_date) ASC
      LIMIT 5
    `).all()
  ].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 10);

  const incomeByMonth = db.prepare(`
    SELECT strftime('%Y-%m', payment_date) as month, ROUND(COALESCE(SUM(amount_received),0),2) as amount
    FROM payments
    WHERE payment_date IS NOT NULL
    GROUP BY strftime('%Y-%m', payment_date)
    ORDER BY month DESC
    LIMIT 6
  `).all();

  return {
    activeProjects,
    pendingPayments,
    pendingTasks,
    overdueInvoices,
    upcomingDeadlines,
    followUps,
    recentActivity,
    pendingTaskItems,
    reminders,
    incomeByMonth
  };
}

module.exports = {
  initDatabase,
  listClients,
  upsertClient,
  deleteClient,
  listLeads,
  upsertLead,
  deleteLead,
  listProjects,
  upsertProject,
  deleteProject,
  listTasks,
  upsertTask,
  deleteTask,
  listInvoices,
  upsertInvoice,
  deleteInvoice,
  markInvoicePaid,
  listInvoiceTemplates,
  upsertInvoiceTemplate,
  deleteInvoiceTemplate,
  listPayments,
  upsertPayment,
  deletePayment,
  getInvoiceById,
  getDashboard
};
