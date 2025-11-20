import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { invoiceApi } from './services/api';
import { Invoice, UpdateInvoiceData, PaginationInfo } from './types/invoice';

function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<UpdateInvoiceData>({});

  // Fetch invoices
  const fetchInvoices = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await invoiceApi.list(page, 10);
      setInvoices(response.data);
      setPagination(response.pagination);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Handle file drop
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        const invoice = await invoiceApi.uploadAndExtract(file, provider, (progress) => {
          setUploadProgress(progress);
        });

        toast.success('Invoice processed successfully!');
        setInvoices((prev) => [invoice, ...prev]);
        setSelectedInvoice(invoice);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to process invoice');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [provider]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  // Handle form change
  const handleFormChange = (field: keyof UpdateInvoiceData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle line item change
  const handleLineItemChange = (index: number, field: string, value: any) => {
    const lineItems = [...(formData.lineItems || selectedInvoice?.lineItems || [])];
    lineItems[index] = { ...lineItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, lineItems }));
  };

  // Add line item
  const addLineItem = () => {
    const lineItems = [...(formData.lineItems || selectedInvoice?.lineItems || [])];
    lineItems.push({ description: '', quantity: 1, unitPrice: 0, lineTotal: 0 });
    setFormData((prev) => ({ ...prev, lineItems }));
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    const lineItems = [...(formData.lineItems || selectedInvoice?.lineItems || [])];
    lineItems.splice(index, 1);
    setFormData((prev) => ({ ...prev, lineItems }));
  };

  // Open invoice modal
  const openInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      supplierName: invoice.supplierName,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    });
    setEditMode(false);
  };

  // Save invoice
  const saveInvoice = async () => {
    if (!selectedInvoice) return;

    try {
      const updated = await invoiceApi.update(selectedInvoice.id, {
        ...formData,
        status: 'SAVED',
      });

      setInvoices((prev) =>
        prev.map((inv) => (inv.id === updated.id ? updated : inv))
      );
      setSelectedInvoice(updated);
      setEditMode(false);
      toast.success('Invoice saved successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save invoice');
    }
  };

  // Delete invoice
  const deleteInvoice = async () => {
    if (!selectedInvoice) return;
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await invoiceApi.delete(selectedInvoice.id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== selectedInvoice.id));
      setSelectedInvoice(null);
      toast.success('Invoice deleted successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete invoice');
    }
  };

  // Format currency
  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Invoice Processor</h1>
        <p>Upload invoices and extract data using AI</p>
      </header>

      {/* Provider Selection */}
      <div className="provider-select">
        <button
          className={`provider-btn ${provider === 'openai' ? 'active' : ''}`}
          onClick={() => setProvider('openai')}
        >
          OpenAI
        </button>
        <button
          className={`provider-btn ${provider === 'gemini' ? 'active' : ''}`}
          onClick={() => setProvider('gemini')}
        >
          Gemini
        </button>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="upload-icon">📄</div>
        {uploading ? (
          <>
            <h3>Processing invoice...</h3>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p>{uploadProgress}% uploaded</p>
          </>
        ) : isDragActive ? (
          <h3>Drop the file here...</h3>
        ) : (
          <>
            <h3>Drag & drop an invoice here</h3>
            <p>or click to select a file (PDF, JPG, PNG - max 10MB)</p>
          </>
        )}
      </div>

      {/* Invoice List */}
      <div className="invoice-list">
        <h2>Recent Invoices</h2>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <p>No invoices yet. Upload your first invoice above!</p>
          </div>
        ) : (
          <>
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="invoice-card"
                onClick={() => openInvoice(invoice)}
              >
                <div className="invoice-card-header">
                  <h3>{invoice.supplierName || invoice.fileName}</h3>
                  <span className={`status-badge status-${invoice.status}`}>
                    {invoice.status}
                  </span>
                </div>
                <div className="invoice-card-details">
                  <span>
                    Invoice #: <strong>{invoice.invoiceNumber || '-'}</strong>
                  </span>
                  <span>
                    Date: <strong>{invoice.invoiceDate || '-'}</strong>
                  </span>
                  <span>
                    Total:{' '}
                    <strong>
                      {formatCurrency(invoice.total, invoice.currency)}
                    </strong>
                  </span>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => fetchInvoices(pagination.page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => fetchInvoices(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invoice Details</h2>
              <button
                className="close-btn"
                onClick={() => setSelectedInvoice(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Confidence Score */}
              {selectedInvoice.confidence !== null && (
                <div className="confidence">
                  <strong>
                    Extraction Confidence:{' '}
                    {Math.round(selectedInvoice.confidence * 100)}%
                  </strong>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{ width: `${selectedInvoice.confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Form */}
              <div className="form-grid" style={{ marginTop: 20 }}>
                <div className="form-group">
                  <label>Supplier Name</label>
                  <input
                    type="text"
                    value={formData.supplierName || ''}
                    onChange={(e) =>
                      handleFormChange('supplierName', e.target.value)
                    }
                    disabled={!editMode}
                  />
                </div>

                <div className="form-group">
                  <label>Invoice Number</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber || ''}
                    onChange={(e) =>
                      handleFormChange('invoiceNumber', e.target.value)
                    }
                    disabled={!editMode}
                  />
                </div>

                <div className="form-group">
                  <label>Invoice Date</label>
                  <input
                    type="date"
                    value={formData.invoiceDate || ''}
                    onChange={(e) =>
                      handleFormChange('invoiceDate', e.target.value)
                    }
                    disabled={!editMode}
                  />
                </div>

                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={(e) =>
                      handleFormChange('dueDate', e.target.value)
                    }
                    disabled={!editMode}
                  />
                </div>

                <div className="form-group">
                  <label>Currency</label>
                  <select
                    value={formData.currency || 'USD'}
                    onChange={(e) =>
                      handleFormChange('currency', e.target.value)
                    }
                    disabled={!editMode}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Subtotal</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.subtotal || ''}
                    onChange={(e) =>
                      handleFormChange(
                        'subtotal',
                        parseFloat(e.target.value) || null
                      )
                    }
                    disabled={!editMode}
                  />
                </div>

                <div className="form-group">
                  <label>Tax Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxAmount || ''}
                    onChange={(e) =>
                      handleFormChange(
                        'taxAmount',
                        parseFloat(e.target.value) || null
                      )
                    }
                    disabled={!editMode}
                  />
                </div>

                <div className="form-group">
                  <label>Total</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total || ''}
                    onChange={(e) =>
                      handleFormChange(
                        'total',
                        parseFloat(e.target.value) || null
                      )
                    }
                    disabled={!editMode}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="line-items">
                <h3>Line Items</h3>
                {(formData.lineItems || selectedInvoice.lineItems || []).map(
                  (item, index) => (
                    <div key={index} className="line-item">
                      <div className="form-group">
                        <label>Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              'description',
                              e.target.value
                            )
                          }
                          disabled={!editMode}
                        />
                      </div>
                      <div className="form-group">
                        <label>Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              'quantity',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={!editMode}
                        />
                      </div>
                      <div className="form-group">
                        <label>Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              'unitPrice',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={!editMode}
                        />
                      </div>
                      <div className="form-group">
                        <label>Line Total</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.lineTotal}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              'lineTotal',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={!editMode}
                        />
                      </div>
                      {editMode && (
                        <button
                          className="remove-line-btn"
                          onClick={() => removeLineItem(index)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                )}
                {editMode && (
                  <button className="add-line-btn" onClick={addLineItem}>
                    + Add Line Item
                  </button>
                )}
              </div>
            </div>

            <div className="modal-actions">
              {editMode ? (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditMode(false);
                      openInvoice(selectedInvoice);
                    }}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={saveInvoice}>
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-danger"
                    onClick={deleteInvoice}
                  >
                    Delete
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setEditMode(true)}
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
