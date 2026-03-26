import { useMemo, useState } from 'react';
import type { Client, Project } from '../types';

type Props = {
  clients: Client[];
  projects: Project[];
  onSave: (payload: Project) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);

const emptyProject: Project = {
  client_id: undefined,
  title: '',
  description: '',
  status: 'Active',
  budget: 0,
  start_date: today,
  deadline: ''
};

export function ProjectsModule({ clients, projects, onSave, onDelete }: Props) {
  const [form, setForm] = useState<Project>(emptyProject);
  const [clientInput, setClientInput] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Project['status']>('All');
  const [clientFilterId, setClientFilterId] = useState<number | 'All'>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const rankedClients = useMemo(
    () => [...clients].sort((first, second) => new Date(second.created_at || '').getTime() - new Date(first.created_at || '').getTime()),
    [clients]
  );

  const visibleProjects = useMemo(() => {
    const term = search.toLowerCase().trim();

    return projects.filter((project) => {
      const matchesSearch = [project.title, project.client_name || '', project.description || ''].join(' ').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
      const matchesClient = clientFilterId === 'All' || project.client_id === clientFilterId;
      const dateValue = project.deadline || project.start_date || '';
      const matchesFrom = !fromDate || (dateValue && dateValue >= fromDate);
      const matchesTo = !toDate || (dateValue && dateValue <= toDate);

      return matchesSearch && matchesStatus && matchesClient && matchesFrom && matchesTo;
    });
  }, [projects, search, statusFilter, clientFilterId, fromDate, toDate]);

  const handleStatusChange = (status: Project['status']) => {
    const next: Project = { ...form, status };
    if (status === 'Active' && !next.start_date) {
      next.start_date = today;
    }
    if (status === 'Completed' && !next.deadline) {
      next.deadline = today;
    }
    setForm(next);
  };

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(form);
    setForm(emptyProject);
    setClientInput('');
  };

  return (
    <div className="module-grid">
      <section className="card">
        <h3>{form.id ? 'Edit Project' : 'Add Project'}</h3>
        <form className="form-grid" onSubmit={submitForm}>
          <label>
            Client (Search Dropdown)
            <input
              list="project-client-options"
              placeholder="Type and select client"
              value={clientInput}
              onChange={(e) => {
                const value = e.target.value;
                const matchedClient = rankedClients.find((client) => client.name.toLowerCase() === value.trim().toLowerCase());
                setClientInput(value);
                setForm({ ...form, client_id: matchedClient?.id });
              }}
              title="Search clients"
            />
            <datalist id="project-client-options">
              {rankedClients.map((client) => <option key={client.id} value={client.name} />)}
            </datalist>
          </label>

          <label>
            Project Title
            <input
              placeholder="Project Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              title="Project name"
            />
          </label>

          <label>
            Description
            <textarea
              rows={2}
              placeholder="Description"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              title="Project scope details"
            />
          </label>

          <label>
            Status
            <select value={form.status} onChange={(e) => handleStatusChange(e.target.value as Project['status'])}>
              <option>Active</option>
              <option>Completed</option>
              <option>On Hold</option>
            </select>
          </label>

          <label>
            Agreed Budget
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Agreed Budget"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
              title="Project budget amount"
            />
          </label>

          <label>
            Start Date
            <input type="date" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </label>

          <label>
            End / Deadline Date
            <input type="date" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </label>

          <div className="actions-row">
            <button type="submit">{form.id ? 'Update Project' : 'Save Project'}</button>
            {form.id && (
              <button
                type="button"
                onClick={() => {
                  setForm(emptyProject);
                  setClientInput('');
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="row space-between">
          <h3>Projects</h3>
          <div className="row">
            <input placeholder="Search by project/client" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="filter-btn" onClick={() => setShowFilters(true)} title="Open project filters">Filter</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Client</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Deadline</th>
                <th>Tasks</th>
                <th>Invoiced</th>
                <th>Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map((project) => (
                <tr key={project.id}>
                  <td>{project.title}</td>
                  <td>{project.client_name || '-'}</td>
                  <td>{project.status}</td>
                  <td>${project.budget.toFixed(2)}</td>
                  <td>{project.deadline || '-'}</td>
                  <td>{project.task_count || 0}</td>
                  <td>${Number(project.amount_invoiced || 0).toFixed(2)}</td>
                  <td>${Number(project.amount_received || 0).toFixed(2)}</td>
                  <td className="actions-row">
                    <button onClick={() => setSelectedProject(project)}>Details</button>
                    <button
                      onClick={() => {
                        setForm(project);
                        setClientInput(project.client_name || '');
                      }}
                    >
                      Edit
                    </button>
                    <button onClick={() => project.id && onDelete(project.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedProject && (
        <div className="modal-backdrop" onClick={() => setSelectedProject(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Project Details</h3>
            <div className="detail-grid">
              <p><strong>Title:</strong> {selectedProject.title}</p>
              <p><strong>Client:</strong> {selectedProject.client_name || '-'}</p>
              <p><strong>Status:</strong> {selectedProject.status}</p>
              <p><strong>Budget:</strong> ${Number(selectedProject.budget || 0).toFixed(2)}</p>
              <p><strong>Start Date:</strong> {selectedProject.start_date || '-'}</p>
              <p><strong>Deadline:</strong> {selectedProject.deadline || '-'}</p>
              <p><strong>Tasks:</strong> {selectedProject.task_count || 0}</p>
              <p><strong>Invoiced:</strong> ${Number(selectedProject.amount_invoiced || 0).toFixed(2)}</p>
              <p><strong>Received:</strong> ${Number(selectedProject.amount_received || 0).toFixed(2)}</p>
            </div>
            <p><strong>Description:</strong> {selectedProject.description || 'No description'}</p>
            <div className="actions-row">
              <button
                onClick={() => {
                  setForm(selectedProject);
                  setClientInput(selectedProject.client_name || '');
                  setSelectedProject(null);
                }}
              >
                Edit Project
              </button>
              <button onClick={() => setSelectedProject(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="modal-backdrop" onClick={() => setShowFilters(false)}>
          <div className="modal-card filter-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Project Filters</h3>
            <div className="filters-row">
              <label>
                Status
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                  <option>All</option>
                  <option>Active</option>
                  <option>Completed</option>
                  <option>On Hold</option>
                </select>
              </label>

              <label>
                Client
                <select value={clientFilterId} onChange={(e) => setClientFilterId(e.target.value === 'All' ? 'All' : Number(e.target.value))}>
                  <option value="All">All</option>
                  {rankedClients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </label>

              <label>
                From Date
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </label>

              <label>
                To Date
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </label>
            </div>

            <div className="actions-row">
              <button
                onClick={() => {
                  setStatusFilter('All');
                  setClientFilterId('All');
                  setFromDate('');
                  setToDate('');
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
