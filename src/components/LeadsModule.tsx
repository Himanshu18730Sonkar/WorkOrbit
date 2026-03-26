import { useMemo, useState } from 'react';
import type { Lead } from '../types';

type Props = {
  leads: Lead[];
  onSave: (payload: Lead) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

const emptyLead: Lead = {
  name: '',
  source: '',
  method: 'Email',
  date_contacted: new Date().toISOString().slice(0, 10),
  status: 'Not Contacted',
  follow_up_date: '',
  notes: ''
};

const statuses = ['Not Contacted', 'Contacted', 'Replied', 'Interested', 'Closed', 'No Response'] as const;

export function LeadsModule({ leads, onSave, onDelete }: Props) {
  const [form, setForm] = useState<Lead>(emptyLead);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | Lead['status']>('All');
  const [methodFilter, setMethodFilter] = useState<'All' | Lead['method']>('All');

  const visibleLeads = useMemo(() => {
    const term = search.toLowerCase().trim();

    return leads.filter((lead) => {
      const matchesSearch = [lead.name, lead.source || '', lead.method, lead.status, lead.notes || '']
        .join(' ')
        .toLowerCase()
        .includes(term);
      const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
      const matchesMethod = methodFilter === 'All' || lead.method === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [leads, search, statusFilter, methodFilter]);

  return (
    <div className="module-grid">
      <section className="card">
        <h3>{form.id ? 'Edit Lead' : 'Add Lead / Outreach'}</h3>
        <form className="form-grid" onSubmit={async (event) => {
          event.preventDefault();
          await onSave(form);
          setForm(emptyLead);
        }}>
          <label>
            Business / Person Name
            <input placeholder="Business / Person Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Source (Optional)
            <input placeholder="Google Maps, Instagram, Referral..." value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </label>
          <label>
            Contact Type
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as Lead['method'] })}>
              <option>Email</option>
              <option>WhatsApp</option>
              <option>LinkedIn</option>
              <option>Phone</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Contact Date
            <input type="date" value={form.date_contacted || ''} onChange={(e) => setForm({ ...form, date_contacted: e.target.value })} />
          </label>
          <label>
            Contact Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Lead['status'] })}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label>
            Follow-up Date
            <input type="date" value={form.follow_up_date || ''} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
          </label>
          <label>
            Notes
            <textarea rows={2} placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <div className="actions-row">
            <button type="submit">{form.id ? 'Update Lead' : 'Save Lead'}</button>
            {form.id && <button type="button" onClick={() => setForm(emptyLead)}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="row space-between">
          <h3>Outreach Pipeline</h3>
          <div className="row">
            <input placeholder="Search leads" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="filter-btn" onClick={() => setShowFilters(true)}>Filter</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Source</th>
                <th>Method</th>
                <th>Contacted</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.name}</td>
                  <td>{lead.source || '-'}</td>
                  <td>{lead.method}</td>
                  <td>{lead.date_contacted || '-'}</td>
                  <td><span className={`badge ${lead.status.replace(/\s+/g, '-').toLowerCase()}`}>{lead.status}</span></td>
                  <td>{lead.follow_up_date || '-'}</td>
                  <td className="actions-row">
                    <button onClick={() => setForm(lead)}>Edit</button>
                    <button onClick={() => lead.id && onDelete(lead.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showFilters && (
        <div className="modal-backdrop" onClick={() => setShowFilters(false)}>
          <div className="modal-card filter-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Lead Filters</h3>
            <div className="filters-row">
              <label>
                Contact Status
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                  <option value="All">All</option>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>

              <label>
                Contact Type
                <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as typeof methodFilter)}>
                  <option value="All">All</option>
                  <option value="Email">Email</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Phone">Phone</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>

            <div className="actions-row">
              <button
                onClick={() => {
                  setStatusFilter('All');
                  setMethodFilter('All');
                }}
              >
                Reset Filters
              </button>
              <button onClick={() => setShowFilters(false)}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
