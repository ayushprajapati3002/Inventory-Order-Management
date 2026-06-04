import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineUserGroup } from 'react-icons/hi';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';

const emptyForm = { full_name: '', email: '', phone: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Generate a consistent color from a name string
function avatarColor(name) {
  const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name) {
  return name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function validate(form) {
  const e = {};
  if (!form.full_name.trim()) e.full_name = 'Full name is required';
  if (!form.email.trim()) e.email = 'Email is required';
  else if (!EMAIL_RE.test(form.email)) e.email = 'Enter a valid email address';
  
  const cleanPhone = form.phone.replace(/\D/g, '');
  if (!form.phone.trim()) e.phone = 'Phone number is required';
  else if (cleanPhone.length !== 10) e.phone = 'Phone number must be exactly 10 digits';
  return e;
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await getCustomers();
      setCustomers(data);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() =>
    customers.filter((c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    ), [customers, search]);

  const handleField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const handleBlur = (field) => {
    const e = validate(form);
    if (e[field]) setErrors((prev) => ({ ...prev, [field]: e[field] }));
    else setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const openAdd = () => {
    setEditing(null); setForm(emptyForm); setErrors({});
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ full_name: c.full_name, email: c.email, phone: c.phone });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      };
      if (editing) {
        await updateCustomer(editing.id, payload);
        toast.success(`Customer "${payload.full_name}" updated`);
      } else {
        await createCustomer(payload);
        toast.success(`Customer "${payload.full_name}" added`);
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to save customer';
      if (typeof msg === 'string' && msg.toLowerCase().includes('email')) {
        setErrors((e) => ({ ...e, email: 'This email is already registered' }));
      } else {
        toast.error(typeof msg === 'string' ? msg : 'Failed to save customer');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteCustomer(deleting.id);
      toast.success(`"${deleting.full_name}" removed`);
      setDeleting(null);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Customers</h2>
          <p>Manage your customer database</p>
          {!loading && (
            <span className="count-badge">{customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="add-customer-btn">
          <HiOutlinePlus /> Add Customer
        </button>
      </div>

      <div className="toolbar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email or phone…" />
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingSpinner skeleton cols={4} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: 0 }}>
                    <EmptyState
                      icon={<HiOutlineUserGroup />}
                      title={search ? 'No results found' : 'No customers yet'}
                      description={search ? `No customers match "${search}"` : 'Add your first customer to get started.'}
                      action={!search && (
                        <button className="btn btn-primary" onClick={openAdd}>
                          <HiOutlinePlus /> Add Customer
                        </button>
                      )}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="customer-cell">
                        <div className="avatar" style={{ background: avatarColor(c.full_name) }}>
                          {initials(c.full_name)}
                        </div>
                        <strong>{c.full_name}</strong>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.email}</td>
                    <td>{c.phone}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-icon" onClick={() => openEdit(c)} title="Edit customer" id={`edit-customer-${c.id}`}>
                          <HiOutlinePencil />
                        </button>
                        <button className="btn-icon danger" onClick={() => setDeleting(c)} title="Delete customer" id={`delete-customer-${c.id}`}>
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} id="save-customer-btn">
              {submitting ? 'Saving…' : editing ? 'Update Customer' : 'Add Customer'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor="cust-name">Full Name</label>
          <input
            id="cust-name"
            name="full_name"
            placeholder="e.g. Jane Smith"
            value={form.full_name}
            onChange={(e) => handleField('full_name', e.target.value)}
            onBlur={() => handleBlur('full_name')}
            className={errors.full_name ? 'input-error' : form.full_name ? 'input-valid' : ''}
          />
          {errors.full_name && <div className="form-error">{errors.full_name}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="cust-email">Email Address</label>
          <input
            id="cust-email"
            name="email"
            type="email"
            placeholder="e.g. jane@example.com"
            value={form.email}
            onChange={(e) => handleField('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            className={errors.email ? 'input-error' : EMAIL_RE.test(form.email) ? 'input-valid' : ''}
          />
          {errors.email && <div className="form-error">{errors.email}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="cust-phone">Phone Number</label>
          <input
            id="cust-phone"
            name="phone"
            placeholder="e.g. 123-456-7890"
            value={form.phone}
            onChange={(e) => handleField('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            className={errors.phone ? 'input-error' : form.phone.replace(/\D/g, '').length === 10 ? 'input-valid' : ''}
          />
          {errors.phone && <div className="form-error">{errors.phone}</div>}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Remove Customer"
        message={`Remove "${deleting?.full_name}"? This will also delete all their associated orders.`}
        confirmLabel="Remove Customer"
        submitting={submitting}
        danger
      />
    </div>
  );
}
