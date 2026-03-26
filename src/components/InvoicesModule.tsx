import { useEffect, useMemo, useRef, useState } from 'react';
import type { Client, Invoice, InvoiceTemplateDoc, Project } from '../types';

type Props = {
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  onSave: (payload: Invoice) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onMarkPaid: (id: number) => Promise<void>;
  onExportPdf: (id: number) => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);

type AutoFieldKey =
  | 'INVOICE_NUMBER'
  | 'INVOICE_DATE'
  | 'DUE_DATE'
  | 'CLIENT_NAME'
  | 'CLIENT_COMPANY'
  | 'CLIENT_COUNTRY'
  | 'PROJECT_TITLE'
  | 'AMOUNT'
  | 'CURRENCY'
  | 'PAYMENT_TERMS';

const autoFields: { key: AutoFieldKey; label: string }[] = [
  { key: 'INVOICE_NUMBER', label: 'Invoice Number' },
  { key: 'INVOICE_DATE', label: 'Invoice Date' },
  { key: 'DUE_DATE', label: 'Due Date' },
  { key: 'CLIENT_NAME', label: 'Client Name' },
  { key: 'CLIENT_COMPANY', label: 'Client Company' },
  { key: 'CLIENT_COUNTRY', label: 'Client Country' },
  { key: 'PROJECT_TITLE', label: 'Project Title' },
  { key: 'AMOUNT', label: 'Amount' },
  { key: 'CURRENCY', label: 'Currency' },
  { key: 'PAYMENT_TERMS', label: 'Payment Terms' }
];

const defaultTemplateHtml = `
  <h1>Invoice</h1>
  <p><strong>Invoice Number:</strong> <span class="auto-field-chip" data-auto-token="INVOICE_NUMBER" contenteditable="false">{{INVOICE_NUMBER}}</span></p>
  <p><strong>Date:</strong> <span class="auto-field-chip" data-auto-token="INVOICE_DATE" contenteditable="false">{{INVOICE_DATE}}</span></p>
  <p><strong>Client:</strong> <span class="auto-field-chip" data-auto-token="CLIENT_NAME" contenteditable="false">{{CLIENT_NAME}}</span></p>
  <hr />
  <h2>Services</h2>
  <ul>
    <li>Write your service details here</li>
    <li>Add deliverables, milestones, and timeline</li>
  </ul>
  <h2>Payment</h2>
  <p><strong>Amount:</strong> <span class="auto-field-chip" data-auto-token="CURRENCY" contenteditable="false">{{CURRENCY}}</span> <span class="auto-field-chip" data-auto-token="AMOUNT" contenteditable="false">{{AMOUNT}}</span></p>
  <p><strong>Terms:</strong> <span class="auto-field-chip" data-auto-token="PAYMENT_TERMS" contenteditable="false">{{PAYMENT_TERMS}}</span></p>
`;

const cleanText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const copyWithFallback = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_error) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  }
};

type ApplyModalState = {
  open: boolean;
  template: InvoiceTemplateDoc | null;
  clientId: number | undefined;
  projectId: number | undefined;
  amount: number;
  dueDate: string;
  currency: string;
  paymentTerms: string;
  invoiceDate: string;
  previewHtml: string;
};

type ViewModalState = {
  open: boolean;
  title: string;
  html: string;
  invoice: Invoice | null;
};

function renderAutomationTokens(templateHtml: string, values: Record<AutoFieldKey, string>) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(templateHtml, 'text/html');

  doc.querySelectorAll<HTMLElement>('[data-auto-token]').forEach((node) => {
    const token = node.dataset.autoToken as AutoFieldKey | undefined;
    if (!token) return;
    const value = values[token] || `{{${token}}}`;
    node.textContent = value;
    node.setAttribute('contenteditable', 'false');
    node.classList.add('auto-field-chip', 'auto-field-locked');
  });

  let html = doc.body.innerHTML;
  for (const [token, value] of Object.entries(values)) {
    const pattern = new RegExp(`{{\\s*${token}\\s*}}`, 'g');
    html = html.replace(pattern, value);
  }
  return html;
}

export function InvoicesModule({ clients, projects, invoices, onSave, onDelete, onMarkPaid, onExportPdf }: Props) {
  const [templates, setTemplates] = useState<InvoiceTemplateDoc[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [templateName, setTemplateName] = useState('Untitled Invoice Template');
  const [editingTemplateId, setEditingTemplateId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | Invoice['status']>('All');
  const [clientFilterId, setClientFilterId] = useState<number | 'All'>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fontSize, setFontSize] = useState('3');
  const [textColor, setTextColor] = useState('#111827');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [selectedAutoField, setSelectedAutoField] = useState<AutoFieldKey>('CLIENT_NAME');
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

  const [applyModal, setApplyModal] = useState<ApplyModalState>({
    open: false,
    template: null,
    clientId: undefined,
    projectId: undefined,
    amount: 0,
    dueDate: today,
    currency: 'USD',
    paymentTerms: 'Net 7',
    invoiceDate: today,
    previewHtml: ''
  });

  const [viewModal, setViewModal] = useState<ViewModalState>({
    open: false,
    title: 'View Invoice',
    html: '',
    invoice: null
  });

  const editorRef = useRef<HTMLDivElement>(null);

  const loadTemplates = async () => {
    const payload = await window.api.listInvoiceTemplates();
    setTemplates(payload);
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  useEffect(() => {
    if (showEditor && editorRef.current && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = defaultTemplateHtml;
    }
  }, [showEditor]);

  const visibleInvoices = useMemo(() => {
    const term = search.toLowerCase().trim();

    return invoices.filter((invoice) => {
      const matchesSearch = [
        invoice.invoice_number || '',
        invoice.client_name || '',
        invoice.project_title || '',
        invoice.service_description || ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(term);

      const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
      const matchesClient = clientFilterId === 'All' || invoice.client_id === clientFilterId;
      const matchesFrom = !fromDate || invoice.issue_date >= fromDate;
      const matchesTo = !toDate || invoice.issue_date <= toDate;

      return matchesSearch && matchesStatus && matchesClient && matchesFrom && matchesTo;
    });
  }, [invoices, search, statusFilter, clientFilterId, fromDate, toDate]);

  const command = (cmd: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(cmd, false, value);
  };

  const insertAutoFieldToken = () => {
    const token = selectedAutoField;
    command(
      'insertHTML',
      `<span class="auto-field-chip" data-auto-token="${token}" contenteditable="false">{{${token}}}</span>&nbsp;`
    );
  };

  const saveTemplate = async () => {
    const html = editorRef.current?.innerHTML || '';
    await window.api.saveInvoiceTemplate({
      id: editingTemplateId,
      name: templateName.trim() || 'Untitled Invoice Template',
      content_html: html
    });
    await loadTemplates();
    setShowEditor(false);
    setEditingTemplateId(undefined);
    setTemplateName('Untitled Invoice Template');
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const openCreateEditor = () => {
    setShowEditor(true);
    setEditingTemplateId(undefined);
    setTemplateName('Untitled Invoice Template');
    if (editorRef.current) {
      editorRef.current.innerHTML = defaultTemplateHtml;
    }
  };

  const openEditEditor = (item: InvoiceTemplateDoc) => {
    setShowEditor(true);
    setEditingTemplateId(item.id);
    setTemplateName(item.name);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = item.content_html || defaultTemplateHtml;
      }
    }, 0);
  };

  const removeTemplate = async (id?: number) => {
    if (!id) return;
    await window.api.deleteInvoiceTemplate(id);
    await loadTemplates();
  };

  const getAutomationValues = (state: ApplyModalState) => {
    const selectedClient = clients.find((item) => item.id === state.clientId);
    const selectedProject = projects.find((item) => item.id === state.projectId);

    const values: Record<AutoFieldKey, string> = {
      INVOICE_NUMBER: 'Auto Generated on Save',
      INVOICE_DATE: state.invoiceDate || today,
      DUE_DATE: state.dueDate || today,
      CLIENT_NAME: selectedClient?.name || 'Not Linked',
      CLIENT_COMPANY: selectedClient?.company || '-',
      CLIENT_COUNTRY: selectedClient?.country || '-',
      PROJECT_TITLE: selectedProject?.title || '-',
      AMOUNT: Number(state.amount || 0).toFixed(2),
      CURRENCY: state.currency || 'USD',
      PAYMENT_TERMS: state.paymentTerms || 'Net 7'
    };

    return values;
  };

  const automateFromLinkedData = () => {
    if (!applyModal.template) return;
    const values = getAutomationValues(applyModal);
    const previewHtml = renderAutomationTokens(applyModal.template.content_html, values);
    setApplyModal((prev) => ({ ...prev, previewHtml }));
  };

  const openApplyModal = (template: InvoiceTemplateDoc) => {
    setApplyModal({
      open: true,
      template,
      clientId: undefined,
      projectId: undefined,
      amount: 0,
      dueDate: today,
      currency: 'USD',
      paymentTerms: 'Net 7',
      invoiceDate: today,
      previewHtml: template.content_html || ''
    });
  };

  const directLinkClient = () => {
    const fallbackClient = clients[0]?.id;
    if (!fallbackClient) return;
    setApplyModal((prev) => ({ ...prev, clientId: prev.clientId || fallbackClient }));
  };

  const applyTemplateAsInvoice = async () => {
    if (!applyModal.template) return;

    const values = getAutomationValues(applyModal);
    const resolvedHtml = renderAutomationTokens(applyModal.template.content_html, values);
    const plainDescription = cleanText(resolvedHtml);

    await onSave({
      client_id: applyModal.clientId,
      project_id: applyModal.projectId,
      service_description: plainDescription || 'Template-based invoice',
      amount: Number(applyModal.amount || 0),
      currency: applyModal.currency || 'USD',
      payment_terms: applyModal.paymentTerms || 'Net 7',
      issue_date: applyModal.invoiceDate || today,
      due_date: applyModal.dueDate || today,
      status: 'Unpaid',
      document_html: resolvedHtml
    });

    setApplyModal((prev) => ({ ...prev, open: false, template: null, previewHtml: '' }));
  };

  const openInvoiceView = (invoice: Invoice) => {
    const detailsHtml = `
      <h1>Invoice</h1>
      <p><strong>Invoice Number:</strong> ${invoice.invoice_number || '-'}</p>
      <p><strong>Client:</strong> ${invoice.client_name || '-'}</p>
      <p><strong>Project:</strong> ${invoice.project_title || '-'}</p>
      <p><strong>Issue Date:</strong> ${invoice.issue_date}</p>
      <p><strong>Due Date:</strong> ${invoice.due_date}</p>
      <p><strong>Status:</strong> ${invoice.is_overdue ? 'Overdue' : invoice.status}</p>
      <p><strong>Amount:</strong> ${invoice.currency} ${Number(invoice.amount || 0).toFixed(2)}</p>
      <hr />
    `;

    const bodyHtml = invoice.document_html?.trim() || `<p>${invoice.service_description || '-'}</p>`;

    setViewModal({
      open: true,
      title: `Invoice ${invoice.invoice_number || ''}`.trim(),
      html: `${detailsHtml}${bodyHtml}`,
      invoice
    });
  };

  const copyShareText = async (invoice: Invoice) => {
    const shareText = [
      `Invoice: ${invoice.invoice_number || 'Draft'}`,
      `Client: ${invoice.client_name || '-'}`,
      `Project: ${invoice.project_title || '-'}`,
      `Amount: ${invoice.currency} ${Number(invoice.amount || 0).toFixed(2)}`,
      `Issue Date: ${invoice.issue_date}`,
      `Due Date: ${invoice.due_date}`,
      `Status: ${invoice.is_overdue ? 'Overdue' : invoice.status}`,
      `Description: ${invoice.service_description || '-'}`
    ].join('\n');

    const ok = await copyWithFallback(shareText);
    window.alert(ok ? 'Invoice details copied for sharing.' : 'Copy failed. Please copy manually from details view.');
  };

  const safeExportPdf = async (invoiceId?: number) => {
    if (!invoiceId) return;
    try {
      await onExportPdf(invoiceId);
    } catch (_error) {
    }
  };

  return (
    <div className="module-grid invoice-module">
      <section className="card">
        <div className="row space-between">
          <div>
            <h3>Invoice Builder Studio</h3>
            <p className="empty-note">Build prebuilt invoice pages, insert linked auto-fields, and generate invoices from templates.</p>
          </div>
          <button className="btn btn-primary" onClick={openCreateEditor}>Make Prebuild Invoice</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.updated_at || '-'}</td>
                  <td className="actions-row">
                    <button className="btn btn-ghost" onClick={() => openEditEditor(item)}>Open Editor</button>
                    <button className="btn btn-primary" onClick={() => openApplyModal(item)}>Direct Link</button>
                    <button className="btn btn-danger" onClick={() => void removeTemplate(item.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={3}>No prebuilt template yet. Click Make Prebuild Invoice to start.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="row space-between">
          <h3>Invoice History</h3>
          <div className="row">
            <input placeholder="Search invoice/client/project" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="filter-btn" onClick={() => setShowFilters(true)}>Filter</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice_number || '-'}</td>
                  <td>{invoice.client_name || '-'}</td>
                  <td>{invoice.currency} {invoice.amount.toFixed(2)}</td>
                  <td>{invoice.due_date}</td>
                  <td>
                    <span className={`badge ${invoice.is_overdue ? 'overdue' : invoice.status.toLowerCase()}`}>
                      {invoice.is_overdue ? 'Overdue' : invoice.status}
                    </span>
                  </td>
                  <td className="actions-row">
                    <button className="btn btn-ghost" onClick={() => openInvoiceView(invoice)} title="See invoice in read-only view mode">View Mode</button>
                    {invoice.status !== 'Paid' && <button className="btn btn-primary" onClick={() => invoice.id && onMarkPaid(invoice.id)} title="Mark invoice as paid">Mark Paid</button>}
                    <button className="btn btn-ghost" onClick={() => copyShareText(invoice)} title="Copy share-ready invoice text">Share</button>
                    <button className="btn btn-ghost" onClick={() => void safeExportPdf(invoice.id)} title="Export invoice as PDF">Download PDF</button>
                    <button className="btn btn-danger" onClick={() => invoice.id && onDelete(invoice.id)} title="Delete invoice">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showEditor && (
        <div className="modal-backdrop" onClick={() => setShowEditor(false)}>
          <div className="modal-card invoice-editor-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row space-between">
              <h3>{editingTemplateId ? 'Edit Prebuild Invoice' : 'Build Prebuild Invoice'}</h3>
              <div className="actions-row">
                <button className="btn btn-ghost" onClick={() => setShowEditor(false)}>Close</button>
                <button className="btn btn-primary" onClick={() => void saveTemplate()}>Save Template</button>
              </div>
            </div>

            <label className="full-span">
              Template Name
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" />
            </label>

            <div className="editor-toolbar compact">
              <div className="toolbar-main-row">
                <button type="button" className="btn btn-ghost" onClick={() => command('undo')}>Undo</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('redo')}>Redo</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('bold')}><strong>B</strong></button>
                <button type="button" className="btn btn-ghost" onClick={() => command('italic')}><em>I</em></button>
                <button type="button" className="btn btn-ghost" onClick={() => command('underline')}><u>U</u></button>
                <button type="button" className="btn btn-ghost" onClick={() => command('formatBlock', 'H1')}>H1</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('formatBlock', 'H2')}>H2</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('insertUnorderedList')}>Bullets</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('insertOrderedList')}>Numbers</button>

                <label className="toolbar-inline-label">
                  Auto Field
                  <select value={selectedAutoField} onChange={(e) => setSelectedAutoField(e.target.value as AutoFieldKey)}>
                    {autoFields.map((item) => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <button type="button" className="btn btn-primary" onClick={insertAutoFieldToken}>Insert Auto</button>
              </div>

              <button type="button" className="btn btn-ghost" onClick={() => setShowAdvancedTools((value) => !value)}>
                {showAdvancedTools ? 'Hide Tools' : 'More Tools'}
              </button>
            </div>

            {showAdvancedTools && (
              <div className="editor-toolbar advanced-toolbar">
                <button type="button" className="btn btn-ghost" onClick={() => command('strikeThrough')}><s>S</s></button>
                <button type="button" className="btn btn-ghost" onClick={() => command('subscript')}>Sub</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('superscript')}>Sup</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('formatBlock', 'H3')}>H3</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('formatBlock', 'H4')}>H4</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('formatBlock', 'H5')}>H5</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('formatBlock', 'H6')}>H6</button>

                <label className="toolbar-inline-label">
                  Font
                  <select value={fontSize} onChange={(e) => {
                    setFontSize(e.target.value);
                    command('fontSize', e.target.value);
                  }}>
                    <option value="1">10px</option>
                    <option value="2">12px</option>
                    <option value="3">16px</option>
                    <option value="4">18px</option>
                    <option value="5">24px</option>
                    <option value="6">32px</option>
                    <option value="7">48px</option>
                  </select>
                </label>

                <label className="toolbar-inline-label">
                  Text
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      const color = e.target.value;
                      setTextColor(color);
                      command('foreColor', color);
                    }}
                  />
                </label>

                <label className="toolbar-inline-label">
                  Highlight
                  <input
                    type="color"
                    value={highlightColor}
                    onChange={(e) => {
                      const color = e.target.value;
                      setHighlightColor(color);
                      command('hiliteColor', color);
                    }}
                  />
                </label>

                <button type="button" className="btn btn-ghost" onClick={() => command('outdent')}>Outdent</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('indent')}>Indent</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('justifyLeft')}>Left</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('justifyCenter')}>Center</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('justifyRight')}>Right</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('justifyFull')}>Justify</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('insertHorizontalRule')}>HR</button>
                <button type="button" className="btn btn-ghost" onClick={() => {
                  const url = window.prompt('Enter link URL');
                  if (url) {
                    command('createLink', url);
                  }
                }}>
                  Link
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => command('unlink')}>Unlink</button>
                <button type="button" className="btn btn-ghost" onClick={() => command('removeFormat')}>Clear</button>
              </div>
            )}

            <div className="invoice-doc-page-wrap">
              <div
                ref={editorRef}
                className="invoice-doc-editor"
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Start writing your invoice template here..."
              />
            </div>
          </div>
        </div>
      )}

      {viewModal.open && viewModal.invoice && (
        <div className="modal-backdrop" onClick={() => setViewModal((prev) => ({ ...prev, open: false }))}>
          <div className="modal-card invoice-editor-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row space-between">
              <h3>{viewModal.title || 'Invoice Details'}</h3>
              <div className="actions-row">
                <button className="btn btn-ghost" onClick={() => setViewModal((prev) => ({ ...prev, open: false }))}>Close</button>
                <button className="btn btn-ghost" onClick={() => copyShareText(viewModal.invoice as Invoice)}>Share</button>
                <button className="btn btn-primary" onClick={() => void safeExportPdf((viewModal.invoice as Invoice).id)}>Download PDF</button>
              </div>
            </div>

            <div className="view-mode-tag">View Mode (Read Only)</div>

            <div className="invoice-doc-page-wrap">
              <div className="invoice-doc-editor read-only" dangerouslySetInnerHTML={{ __html: viewModal.html }} />
            </div>
          </div>
        </div>
      )}

      {applyModal.open && applyModal.template && (
        <div className="modal-backdrop" onClick={() => setApplyModal((prev) => ({ ...prev, open: false }))}>
          <div className="modal-card filter-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Direct Link Template</h3>
            <div className="filters-row">
              <label>
                Client
                <select value={applyModal.clientId || ''} onChange={(e) => setApplyModal((prev) => ({ ...prev, clientId: Number(e.target.value) || undefined }))}>
                  <option value="">No Client</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </label>

              <label>
                Project (Optional)
                <select value={applyModal.projectId || ''} onChange={(e) => setApplyModal((prev) => ({ ...prev, projectId: Number(e.target.value) || undefined }))}>
                  <option value="">No Project</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                </select>
              </label>

              <label>
                Invoice Date
                <input type="date" value={applyModal.invoiceDate} onChange={(e) => setApplyModal((prev) => ({ ...prev, invoiceDate: e.target.value }))} />
              </label>

              <label>
                Due Date
                <input type="date" value={applyModal.dueDate} onChange={(e) => setApplyModal((prev) => ({ ...prev, dueDate: e.target.value }))} />
              </label>

              <label>
                Amount
                <input type="number" min="0" step="0.01" value={applyModal.amount} onChange={(e) => setApplyModal((prev) => ({ ...prev, amount: Number(e.target.value) || 0 }))} />
              </label>

              <label>
                Currency
                <input value={applyModal.currency} onChange={(e) => setApplyModal((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} />
              </label>

              <label>
                Payment Terms
                <input value={applyModal.paymentTerms} onChange={(e) => setApplyModal((prev) => ({ ...prev, paymentTerms: e.target.value }))} />
              </label>
            </div>

            <div className="actions-row">
              <button className="btn btn-ghost" onClick={directLinkClient}>Link First Client</button>
              <button className="btn btn-ghost" onClick={automateFromLinkedData}>Automate from Linking</button>
              <button className="btn btn-primary" onClick={() => void applyTemplateAsInvoice()}>Create Linked Invoice</button>
            </div>

            <div className="invoice-doc-page-wrap inline-preview">
              <div className="invoice-doc-editor read-only" dangerouslySetInnerHTML={{ __html: applyModal.previewHtml || applyModal.template.content_html }} />
            </div>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="modal-backdrop" onClick={() => setShowFilters(false)}>
          <div className="modal-card filter-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Invoice Filters</h3>
            <div className="filters-row">
              <label>
                Status
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                  <option value="All">All</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                </select>
              </label>

              <label>
                Client
                <select value={clientFilterId} onChange={(e) => setClientFilterId(e.target.value === 'All' ? 'All' : Number(e.target.value))}>
                  <option value="All">All</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </label>

              <label>
                Issue Date From
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </label>

              <label>
                Issue Date To
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </label>
            </div>

            <div className="actions-row">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setStatusFilter('All');
                  setClientFilterId('All');
                  setFromDate('');
                  setToDate('');
                }}
              >
                Reset Filters
              </button>
              <button className="btn btn-primary" onClick={() => setShowFilters(false)}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
