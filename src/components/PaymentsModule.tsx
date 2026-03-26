import { useMemo, useState } from 'react';
import type { Invoice, Payment, Project } from '../types';

type Props = {
  projects: Project[];
  invoices: Invoice[];
  payments: Payment[];
  onSave: (payload: Payment) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

const emptyPayment: Payment = {
  project_id: undefined,
  invoice_id: undefined,
  agreed_value: 0,
  amount_invoiced: 0,
  amount_received: 0,
  pending_balance: 0,
  payment_method: 'Bank Transfer',
  payment_date: new Date().toISOString().slice(0, 10),
  status: 'Pending',
  notes: ''
};

export function PaymentsModule({ projects, invoices, payments, onSave, onDelete }: Props) {
  const [form, setForm] = useState<Payment>(emptyPayment);
  const [projectInput, setProjectInput] = useState('');
  const [invoiceInput, setInvoiceInput] = useState('');

  const rankedProjects = useMemo(() => [...projects].sort((a, b) => a.title.localeCompare(b.title)), [projects]);
  const rankedInvoices = useMemo(() => [...invoices].sort((a, b) => (a.invoice_number || '').localeCompare(b.invoice_number || '')), [invoices]);
  const invoiceChoices = useMemo(
    () => rankedInvoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.invoice_number || 'Draft',
      label: `${invoice.invoice_number || 'Draft'} | ${invoice.client_name || 'Unknown Client'}`
    })),
    [rankedInvoices]
  );

  const projectChoices = useMemo(
    () => rankedProjects.map((project) => ({ id: project.id, title: project.title })),
    [rankedProjects]
  );

  function updateAmount<K extends keyof Payment>(key: K, value: number) {
    const next = { ...form, [key]: value };
    next.pending_balance = Number((next.agreed_value - next.amount_received).toFixed(2));
    if (next.pending_balance <= 0) next.status = 'Paid';
    else if (next.amount_received > 0) next.status = 'Partially Paid';
    else next.status = 'Pending';
    setForm(next);
  }

  return (
    <div className="module-grid">
      <section className="card">
        <h3>{form.id ? 'Edit Payment' : 'Add Payment Record'}</h3>
        <form className="form-grid" onSubmit={async (event) => {
          event.preventDefault();
          await onSave(form);
          setForm(emptyPayment);
          setProjectInput('');
          setInvoiceInput('');
        }}>
          <label>
            Linked Project (Search Dropdown)
            <input
              list="payment-project-options"
              placeholder="Type and select project"
              value={projectInput}
              onChange={(e) => {
                const value = e.target.value;
                const matchedProject = projectChoices.find((project) => project.title.toLowerCase() === value.trim().toLowerCase());
                setProjectInput(value);
                setForm({ ...form, project_id: matchedProject?.id });
              }}
              title="Search related project"
            />
            <datalist id="payment-project-options">
              {projectChoices.map((project) => <option key={project.id} value={project.title} />)}
            </datalist>
          </label>
          <label>
            Linked Invoice (Search Dropdown)
            <input
              list="payment-invoice-options"
              placeholder="Type and select invoice"
              value={invoiceInput}
              onChange={(e) => {
                const value = e.target.value;
                const typed = value.trim();
                const invoiceNumber = typed.includes('|') ? typed.split('|')[0].trim() : typed;
                const matchedInvoice = invoiceChoices.find((invoice) => invoice.number.toLowerCase() === invoiceNumber.toLowerCase());
                setInvoiceInput(value);
                setForm({ ...form, invoice_id: matchedInvoice?.id });
              }}
              title="Search related invoice"
            />
            <datalist id="payment-invoice-options">
              {invoiceChoices.map((invoice) => <option key={invoice.id} value={invoice.label} />)}
            </datalist>
            {form.invoice_id && (
              <button
                type="button"
                className="filter-btn"
                onClick={() => {
                  setForm({ ...form, invoice_id: undefined });
                  setInvoiceInput('');
                }}
                title="Unlink selected invoice"
              >
                Clear Linked Invoice
              </button>
            )}
          </label>
          <label>
            Agreed Value
            <input type="number" min="0" step="0.01" placeholder="Agreed Value" value={form.agreed_value} onChange={(e) => updateAmount('agreed_value', Number(e.target.value))} title="Total agreed value" />
          </label>
          <label>
            Amount Invoiced
            <input type="number" min="0" step="0.01" placeholder="Amount Invoiced" value={form.amount_invoiced} onChange={(e) => updateAmount('amount_invoiced', Number(e.target.value))} title="Total amount invoiced" />
          </label>
          <label>
            Amount Received
            <input type="number" min="0" step="0.01" placeholder="Amount Received" value={form.amount_received} onChange={(e) => updateAmount('amount_received', Number(e.target.value))} title="Total amount received" />
          </label>
          <label>
            Pending Balance
            <input type="number" min="0" step="0.01" placeholder="Pending Balance" value={form.pending_balance} onChange={(e) => setForm({ ...form, pending_balance: Number(e.target.value) })} title="Remaining unpaid amount" />
          </label>
          <label>
            Payment Method
            <input placeholder="Payment Method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} required title="Payment method used" />
          </label>
          <label>
            Payment Date
            <input type="date" value={form.payment_date || ''} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} title="Date payment was made" />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Payment['status'] })} title="Current payment status">
              <option>Pending</option>
              <option>Partially Paid</option>
              <option>Paid</option>
              <option>Overdue</option>
            </select>
          </label>
          <label>
            Notes
            <textarea rows={2} placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} title="Optional payment notes" />
          </label>
          <div className="actions-row">
            <button type="submit" title={form.id ? 'Update existing payment' : 'Save new payment'}>{form.id ? 'Update Payment' : 'Save Payment'}</button>
            {form.id && <button type="button" onClick={() => {
              setForm(emptyPayment);
              setProjectInput('');
              setInvoiceInput('');
            }} title="Cancel editing">Cancel</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <h3>Payment & Income Tracker</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Invoice</th>
                <th>Agreed</th>
                <th>Invoiced</th>
                <th>Received</th>
                <th>Pending</th>
                <th>Status</th>
                <th>Method</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.project_title || '-'}</td>
                  <td>{payment.invoice_number || '-'}</td>
                  <td>${payment.agreed_value.toFixed(2)}</td>
                  <td>${payment.amount_invoiced.toFixed(2)}</td>
                  <td>${payment.amount_received.toFixed(2)}</td>
                  <td>${payment.pending_balance.toFixed(2)}</td>
                  <td><span className={`badge ${payment.status.replace(/\s+/g, '-').toLowerCase()}`}>{payment.status}</span></td>
                  <td>{payment.payment_method}</td>
                  <td>{payment.payment_date || '-'}</td>
                  <td className="actions-row">
                    <button onClick={() => {
                      setForm(payment);
                      setProjectInput(payment.project_title || '');
                      setInvoiceInput(payment.invoice_number || '');
                    }} title="Edit payment record">Edit</button>
                    <button onClick={() => payment.id && onDelete(payment.id)} title="Delete payment record">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
