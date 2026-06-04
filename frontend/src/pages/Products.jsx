import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineCube } from 'react-icons/hi';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';

const emptyForm = { name: '', sku: '', price: '', quantity: '' };

function validate(form) {
  const e = {};
  if (!form.name.trim()) e.name = 'Product name is required';
  if (!form.sku.trim()) e.sku = 'SKU is required';
  if (!form.price || parseFloat(form.price) <= 0) e.price = 'Price must be greater than 0';
  if (form.quantity === '' || parseInt(form.quantity) < 0) e.quantity = 'Quantity must be 0 or more';
  return e;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await getProducts();
      setProducts(data);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() =>
    products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    ), [products, search]);

  const openAdd = () => {
    setEditing(null); setForm(emptyForm); setErrors({});
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, price: String(p.price), quantity: String(p.quantity) });
    setErrors({});
    setShowModal(true);
  };

  const handleField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    // Clear error on change
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  // Live validation on blur
  const handleBlur = (field) => {
    const e = validate(form);
    if (e[field]) setErrors((prev) => ({ ...prev, [field]: e[field] }));
    else setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleSubmit = async () => {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity),
      };
      if (editing) {
        await updateProduct(editing.id, payload);
        toast.success(`"${payload.name}" updated`);
      } else {
        await createProduct(payload);
        toast.success(`"${payload.name}" added to inventory`);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Operation failed';
      // Show inline if SKU duplicate
      if (typeof msg === 'string' && msg.toLowerCase().includes('sku')) {
        setErrors((e) => ({ ...e, sku: 'This SKU already exists' }));
      } else {
        toast.error(typeof msg === 'string' ? msg : 'Operation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteProduct(deleting.id);
      toast.success(`"${deleting.name}" deleted`);
      setDeleting(null);
      fetchProducts();
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
          <h2>Products</h2>
          <p>Manage your product inventory</p>
          {!loading && (
            <span className="count-badge">{products.length} product{products.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="add-product-btn">
          <HiOutlinePlus /> Add Product
        </button>
      </div>

      <div className="toolbar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or SKU…" />
      </div>

      <div className="table-container desktop-only">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Price per Piece</th>
                <th>Quantity</th>
                <th>Total Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingSpinner skeleton cols={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: 0 }}>
                    <EmptyState
                      icon={<HiOutlineCube />}
                      title={search ? 'No results found' : 'No products yet'}
                      description={search ? `No products match "${search}"` : 'Add your first product to get started.'}
                      action={!search && (
                        <button className="btn btn-primary" onClick={openAdd}>
                          <HiOutlinePlus /> Add Product
                        </button>
                      )}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td className="text-mono">{p.sku}</td>
                    <td>${parseFloat(p.price).toFixed(2)}</td>
                    <td>
                      <span style={{ color: p.quantity <= 10 ? 'var(--accent-danger)' : 'inherit', fontWeight: p.quantity <= 10 ? 600 : 400 }}>
                        {p.quantity}
                      </span>
                      {p.quantity <= 10 && <span className="badge badge-warning" style={{ marginLeft: '8px' }}>Low</span>}
                    </td>
                    <td>
                      <strong>${(parseFloat(p.price) * parseInt(p.quantity)).toFixed(2)}</strong>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-icon" onClick={() => openEdit(p)} title="Edit product" id={`edit-product-${p.id}`}><HiOutlinePencil /></button>
                        <button className="btn-icon danger" onClick={() => setDeleting(p)} title="Delete product" id={`delete-product-${p.id}`}><HiOutlineTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile view cards */}
      <div className="mobile-only">
        {loading ? (
          <div className="cards-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card-item skeleton-card">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line" style={{ width: '60%' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<HiOutlineCube />}
            title={search ? 'No results found' : 'No products yet'}
            description={search ? `No products match "${search}"` : 'Add your first product to get started.'}
            action={!search && (
              <button className="btn btn-primary" onClick={openAdd}>
                <HiOutlinePlus /> Add Product
              </button>
            )}
          />
        ) : (
          <div className="cards-grid">
            {filtered.map((p) => (
              <div key={p.id} className="card-item">
                <div className="card-item-header">
                  <div>
                    <h3 className="card-item-title">{p.name}</h3>
                    <div className="card-item-subtitle">{p.sku}</div>
                  </div>
                  {p.quantity <= 10 && <span className="badge badge-warning">Low</span>}
                </div>
                <div className="card-details-grid">
                  <div className="card-detail-item">
                    <span className="card-detail-label">Price per Piece</span>
                    <span className="card-detail-value">${parseFloat(p.price).toFixed(2)}</span>
                  </div>
                  <div className="card-detail-item">
                    <span className="card-detail-label">Quantity</span>
                    <span className="card-detail-value" style={{ color: p.quantity <= 10 ? 'var(--accent-danger)' : 'inherit', fontWeight: p.quantity <= 10 ? 600 : 400 }}>
                      {p.quantity}
                    </span>
                  </div>
                  <div className="card-detail-item" style={{ gridColumn: 'span 2' }}>
                    <span className="card-detail-label">Total Price</span>
                    <span className="card-detail-value" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      ${(parseFloat(p.price) * parseInt(p.quantity)).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="card-item-actions">
                  <button className="btn-icon" onClick={() => openEdit(p)} title="Edit product" id={`edit-product-mobile-${p.id}`}>
                    <HiOutlinePencil /> Edit
                  </button>
                  <button className="btn-icon danger" onClick={() => setDeleting(p)} title="Delete product" id={`delete-product-mobile-${p.id}`}>
                    <HiOutlineTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Product' : 'Add Product'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} id="save-product-btn">
              {submitting ? 'Saving…' : editing ? 'Update Product' : 'Add Product'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor="prod-name">Product Name</label>
          <input
            id="prod-name"
            name="name"
            placeholder="e.g. Widget A"
            value={form.name}
            onChange={(e) => handleField('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            className={errors.name ? 'input-error' : form.name ? 'input-valid' : ''}
          />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="prod-sku">SKU / Code</label>
          <input
            id="prod-sku"
            name="sku"
            placeholder="e.g. WDG-001"
            value={form.sku}
            onChange={(e) => handleField('sku', e.target.value)}
            onBlur={() => handleBlur('sku')}
            className={errors.sku ? 'input-error' : form.sku ? 'input-valid' : ''}
          />
          {errors.sku && <div className="form-error">{errors.sku}</div>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="prod-price">Price per Piece ($)</label>
            <input
              id="prod-price"
              name="price"
              type="number" step="0.01" min="0.01"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => handleField('price', e.target.value)}
              onBlur={() => handleBlur('price')}
              className={errors.price ? 'input-error' : ''}
            />
            {errors.price && <div className="form-error">{errors.price}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="prod-qty">Quantity</label>
            <input
              id="prod-qty"
              name="quantity"
              type="number" min="0"
              placeholder="0"
              value={form.quantity}
              onChange={(e) => handleField('quantity', e.target.value)}
              onBlur={() => handleBlur('quantity')}
              className={errors.quantity ? 'input-error' : ''}
            />
            {errors.quantity && <div className="form-error">{errors.quantity}</div>}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="prod-total-price">Total Price ($)</label>
          <input
            id="prod-total-price"
            name="total_price"
            value={(parseFloat(form.price || 0) * parseInt(form.quantity || 0)).toFixed(2)}
            disabled
            style={{ background: 'var(--bg-input)', color: 'var(--accent-primary)', fontWeight: 'bold' }}
          />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleting?.name}" (${deleting?.sku})? This action cannot be undone.`}
        confirmLabel="Delete Product"
        submitting={submitting}
        danger
      />
    </div>
  );
}
