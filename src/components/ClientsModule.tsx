import { useMemo, useState } from 'react';
import type { Client } from '../types';

type Props = {
  clients: Client[];
  onSave: (payload: Client) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

const contactTypes = ['Email', 'Phone', 'WhatsApp', 'LinkedIn', 'Telegram', 'Other'] as const;

const emptyClient: Client = {
  name: '',
  company: '',
  email: '',
  contact_type: 'Email',
  contact_value: '',
  country: '',
  notes: ''
};

export function ClientsModule({ clients, onSave, onDelete }: Props) {
  const [form, setForm] = useState<Client>(emptyClient);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [contactFilter, setContactFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'oldest' | 'received'>('recent');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const countries = useMemo(
    () => ['All', ...Array.from(new Set(clients.map((item) => item.country).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [clients]
  );

  const filtered = useMemo(() => {
    const searchTerm = search.toLowerCase();

    return [...clients]
      .filter((item) => {
        const matchesSearch = [
          item.name,
          item.company || '',
          item.country,
          item.contact_type || '',
          item.contact_value || ''
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm);

        const matchesCountry = countryFilter === 'All' || item.country === countryFilter;
        const matchesContact = contactFilter === 'All' || (item.contact_type || 'Email') === contactFilter;

        return matchesSearch && matchesCountry && matchesContact;
      })
      .sort((first, second) => {
        if (sortBy === 'name') return first.name.localeCompare(second.name);
        if (sortBy === 'oldest') return new Date(first.created_at || '').getTime() - new Date(second.created_at || '').getTime();
        if (sortBy === 'received') return Number(second.total_received || 0) - Number(first.total_received || 0);
        return new Date(second.created_at || '').getTime() - new Date(first.created_at || '').getTime();
      });
  }, [clients, search, countryFilter, contactFilter, sortBy]);

  const saveClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: Client = {
      ...form,
      email: form.email?.trim() || '',
      contact_type: form.contact_type || 'Email',
      contact_value: form.contact_value?.trim() || ''
    };

    await onSave(payload);
    setForm(emptyClient);
  };

  return (
    <div className="module-grid">
      <section className="card">
        <h3>{form.id ? 'Edit Client' : 'Add Client'}</h3>
        <form className="form-grid" onSubmit={saveClient}>
          <label>
            Client Name
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              title="Client full name"
            />
          </label>

          <label>
            Company (Optional)
            <input
              placeholder="Company (optional)"
              value={form.company || ''}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              title="Company name if available"
            />
          </label>

          <label>
            Contact Type
            <select
              value={form.contact_type || 'Email'}
              onChange={(e) => setForm({ ...form, contact_type: e.target.value as Client['contact_type'] })}
              title="Choose preferred contact type"
            >
              {contactTypes.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Contact Value
            <input
              placeholder="Phone number / username / link"
              value={form.contact_value || ''}
              onChange={(e) => setForm({ ...form, contact_value: e.target.value })}
              title="Contact value for selected type"
            />
          </label>

          <label>
            Country
            <input
              placeholder="Country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              required
              title="Client country"
            />
          </label>

          <label>
            Notes
            <textarea
              placeholder="Notes"
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              title="Optional notes about client"
            />
          </label>

          <div className="actions-row">
            <button type="submit" title={form.id ? 'Update existing client' : 'Save new client'}>{form.id ? 'Update Client' : 'Save Client'}</button>
            {form.id && <button type="button" onClick={() => setForm(emptyClient)} title="Cancel editing">Cancel</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="row space-between">
          <h3>Clients</h3>
          <div className="row">
            <input
              placeholder="Search clients"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              title="Search by name, company, country, contact"
            />
            <button className="filter-btn" onClick={() => setShowFilters(true)} title="Open client filters">Filter</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Country</th>
                <th>Projects</th>
                <th>Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>{client.contact_type || 'Email'}: {client.contact_value || client.email || '-'}</td>
                  <td>{client.country}</td>
                  <td>{client.project_count || 0}</td>
                  <td>${Number(client.total_received || 0).toFixed(2)}</td>
                  <td className="actions-row">
                    <button onClick={() => setSelectedClient(client)} title="View full client details">Details</button>
                    <button onClick={() => setForm(client)} title="Edit client">Edit</button>
                    <button onClick={() => client.id && onDelete(client.id)} title="Delete client">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedClient && (
        <div className="modal-backdrop" onClick={() => setSelectedClient(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Client Details</h3>
            <div className="detail-grid">
              <p><strong>Name:</strong> {selectedClient.name}</p>
              <p><strong>Company:</strong> {selectedClient.company || '-'}</p>
              <p><strong>Contact:</strong> {(selectedClient.contact_type || 'Email') + ': ' + (selectedClient.contact_value || selectedClient.email || '-')}</p>
              <p><strong>Country:</strong> {selectedClient.country}</p>
              <p><strong>Projects:</strong> {selectedClient.project_count || 0}</p>
              <p><strong>Total Received:</strong> ${Number(selectedClient.total_received || 0).toFixed(2)}</p>
            </div>
            <p><strong>Notes:</strong> {selectedClient.notes || 'No notes'}</p>

            <div className="actions-row">
              <button
                onClick={() => {
                  setForm(selectedClient);
                  setSelectedClient(null);
                }}
                title="Edit this client"
              >
                Edit Client
              </button>
              <button onClick={() => setSelectedClient(null)} title="Close details popup">Close</button>
            </div>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="modal-backdrop" onClick={() => setShowFilters(false)}>
          <div className="modal-card filter-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Client Filters</h3>
            <div className="filters-row">
              <label>
                Country
                <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
                  {countries.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
              </label>

              <label>
                Contact Type
                <select value={contactFilter} onChange={(e) => setContactFilter(e.target.value)}>
                  <option value="All">All</option>
                  {contactTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label>
                Sort By
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                  <option value="recent">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="received">Highest Received</option>
                </select>
              </label>
            </div>

            <div className="actions-row">
              <button
                onClick={() => {
                  setCountryFilter('All');
                  setContactFilter('All');
                  setSortBy('recent');
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
