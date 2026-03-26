import { useMemo, useState } from 'react';
import type { Project, Task } from '../types';

type Props = {
  projects: Project[];
  tasks: Task[];
  onSave: (payload: Task) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

const emptyTask: Task = {
  project_id: 0,
  title: '',
  status: 'Pending',
  due_date: '',
  priority: 'Medium'
};

export function TasksModule({ projects, tasks, onSave, onDelete }: Props) {
  const [form, setForm] = useState<Task>(emptyTask);
  const [projectInput, setProjectInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [projectFilterId, setProjectFilterId] = useState<number | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | Task['status']>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | Task['priority']>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const visibleTasks = useMemo(() => {
    const term = search.toLowerCase().trim();
    return tasks.filter((task) => {
      const matchesSearch = [task.title, task.project_title || ''].join(' ').toLowerCase().includes(term);
      const matchesProject = projectFilterId === 'All' || task.project_id === projectFilterId;
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const due = task.due_date || '';
      const matchesFrom = !fromDate || (due && due >= fromDate);
      const matchesTo = !toDate || (due && due <= toDate);
      return matchesSearch && matchesProject && matchesStatus && matchesPriority && matchesFrom && matchesTo;
    });
  }, [tasks, search, projectFilterId, statusFilter, priorityFilter, fromDate, toDate]);

  const rankedProjects = useMemo(() => [...projects].sort((a, b) => a.title.localeCompare(b.title)), [projects]);

  return (
    <div className="module-grid">
      <section className="card">
        <h3>{form.id ? 'Edit Task' : 'Add Task'}</h3>
        <form className="form-grid" onSubmit={async (event) => {
          event.preventDefault();
          if (!form.project_id) return;
          await onSave(form);
          setForm(emptyTask);
          setProjectInput('');
        }}>
          <label>
            Project (Search Dropdown)
            <input
              list="task-project-options"
              placeholder="Type and select project"
              value={projectInput}
              onChange={(e) => {
                const value = e.target.value;
                const matchedProject = rankedProjects.find((project) => project.title.toLowerCase() === value.trim().toLowerCase());
                setProjectInput(value);
                setForm({ ...form, project_id: matchedProject?.id || 0 });
              }}
              required
            />
            <datalist id="task-project-options">
              {rankedProjects.map((project) => <option key={project.id} value={project.title} />)}
            </datalist>
          </label>
          <label>
            Task Title
            <input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Task['status'] })}>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>
          </label>
          <label>
            Priority
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>
          <label>
            Due Date
            <input type="date" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </label>
          <div className="actions-row">
            <button type="submit">{form.id ? 'Update Task' : 'Save Task'}</button>
            {form.id && <button type="button" onClick={() => {
              setForm(emptyTask);
              setProjectInput('');
            }}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="row space-between">
          <h3>Task Board</h3>
          <div className="row">
            <input
              placeholder="Search by task/project"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              title="Search tasks"
            />
            <button className="filter-btn" onClick={() => setShowFilters(true)} title="Open task filters">Filter</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.project_title || '-'}</td>
                  <td>{task.status}</td>
                  <td>{task.priority}</td>
                  <td>{task.due_date || '-'}</td>
                  <td className="actions-row">
                    <button onClick={() => {
                      setForm(task);
                      setProjectInput(task.project_title || rankedProjects.find((project) => project.id === task.project_id)?.title || '');
                    }}>Edit</button>
                    <button onClick={() => task.id && onDelete(task.id)}>Delete</button>
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
            <h3>Task Filters</h3>
            <div className="filters-row">
              <label>
                Project
                <select value={projectFilterId} onChange={(e) => setProjectFilterId(e.target.value === 'All' ? 'All' : Number(e.target.value))}>
                  <option value="All">All</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                </select>
              </label>
              <label>
                Status
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                  <option>All</option>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Done</option>
                </select>
              </label>
              <label>
                Priority
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}>
                  <option>All</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>
              <label>
                Due From
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </label>
              <label>
                Due To
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </label>
            </div>

            <div className="actions-row">
              <button
                onClick={() => {
                  setProjectFilterId('All');
                  setStatusFilter('All');
                  setPriorityFilter('All');
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
