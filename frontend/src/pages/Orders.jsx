import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineEye, HiOutlineTrash, HiOutlineMinus, HiOutlineClipboardList } from 'react-icons/hi';
import { getOrders, createOrder, deleteOrder, getCustomers, getProducts } from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';


export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Order form state
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [orderItems, setOrderItems] = useState([{ product_id: '', quantity: 1 }]);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await getOrders();
      setOrders(data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [c, p] = await Promise.all([getCustomers(), getProducts()]);
      setCustomers(c.data);
      setProducts(p.data);
    } catch {
      toast.error('Failed to load form data');
    }
  };

  const openCreate = async () => {
    await fetchFormData();
    setSelectedCustomer('');
    setOrderItems([{ product_id: '', quantity: 1 }]);
    setFormErrors({});
    setShowCreateModal(true);
  };

  // Filtering
  const filtered = useMemo(() => {
    let list = orders;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        (o.customer_name || '').toLowerCase().includes(q) ||
        String(o.id).toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, search]);

  // Order item helpers
  const addItemRow = () => setOrderItems([...orderItems, { product_id: '', quantity: 1 }]);
  const removeItemRow = (i) => { if (orderItems.length > 1) setOrderItems(orderItems.filter((_, idx) => idx !== i)); };
  const updateItem = (i, field, value) => {
    const u = [...orderItems];
    u[i] = { ...u[i], [field]: value };
    setOrderItems(u);
  };

  const getLineSubtotal = (item) => {
    const p = products.find((x) => x.id === item.product_id);
    return p ? parseFloat(p.price) * parseInt(item.quantity || 0) : 0;
  };
  const grandTotal = orderItems.reduce((s, item) => s + getLineSubtotal(item), 0);

  const validateOrder = () => {
    const e = {};
    if (!selectedCustomer) e.customer = 'Please select a customer';
    const itemErrors = [];
    orderItems.forEach((item, i) => {
      const ie = {};
      if (!item.product_id) ie.product_id = 'Select a product';
      if (!item.quantity || parseInt(item.quantity) <= 0) ie.quantity = 'Must be ≥ 1';
      if (Object.keys(ie).length) itemErrors[i] = ie;
    });
    if (itemErrors.length) e.items = itemErrors;
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreateOrder = async () => {
    if (!validateOrder()) return;
    setSubmitting(true);
    try {
      await createOrder({
        customer_id: selectedCustomer,
        items: orderItems.map((item) => ({ product_id: item.product_id, quantity: parseInt(item.quantity) })),
      });
      toast.success('Order placed successfully');
      setShowCreateModal(false);
      fetchOrders();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create order';
      toast.error(typeof msg === 'string' ? msg : 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteOrder(deleting.id);
      toast.success('Order cancelled — stock restored');
      setDeleting(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancel failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const shortId = (id) => {
    const s = String(id);
    return s.length > 8 ? s.substring(0, 8) + '…' : s;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Orders</h2>
          <p>Track and manage customer orders</p>
          {!loading && (
            <span className="count-badge">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="create-order-btn">
          <HiOutlinePlus /> Create Order
        </button>
      </div>

      <div className="toolbar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by customer or order ID…" />
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Total Price</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingSpinner skeleton cols={7} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: 0 }}>
                    <EmptyState
                      icon={<HiOutlineClipboardList />}
                      title={search ? 'No results found' : 'No orders yet'}
                      description={search ? 'Try adjusting your search.' : 'Create your first order to get started.'}
                      action={!search && (
                        <button className="btn btn-primary" onClick={openCreate}>
                          <HiOutlinePlus /> Create Order
                        </button>
                      )}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id}>
                    <td className="text-mono">{shortId(o.id)}</td>
                    <td><strong>{o.customer_name || '—'}</strong></td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={o.product_name}>
                      {o.product_name || '—'}
                    </td>
                    <td>{o.quantity}</td>
                    <td><strong>${parseFloat(o.total_amount).toFixed(2)}</strong></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(o.created_at)}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-icon" onClick={() => { setViewing(o); setShowViewModal(true); }} title="View order" id={`view-order-${o.id}`}><HiOutlineEye /></button>
                        <button className="btn-icon danger" onClick={() => setDeleting(o)} title="Cancel order" id={`cancel-order-${o.id}`}><HiOutlineTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Order"
        wide
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateOrder} disabled={submitting} id="place-order-btn">
              {submitting ? 'Placing…' : 'Place Order'}
            </button>
          </>
        }
      >
        {/* Customer */}
        <div className="form-group">
          <label htmlFor="order-customer">Customer</label>
          <select
            id="order-customer"
            value={selectedCustomer}
            onChange={(e) => { setSelectedCustomer(e.target.value); setFormErrors((f) => { const n = { ...f }; delete n.customer; return n; }); }}
            className={formErrors.customer ? 'input-error' : ''}
          >
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name} — {c.email}</option>
            ))}
          </select>
          {formErrors.customer && <div className="form-error">{formErrors.customer}</div>}
        </div>

        {/* Items */}
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '10px', display: 'block' }}>
          Order Items
        </label>
        {orderItems.map((item, idx) => (
          <div key={idx} className="order-item-row">
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '11px' }}>Product</label>
              <select
                value={item.product_id}
                onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                className={formErrors.items?.[idx]?.product_id ? 'input-error' : ''}
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — ${parseFloat(p.price).toFixed(2)} (Stock: {p.quantity})</option>
                ))}
              </select>
              {formErrors.items?.[idx]?.product_id && <div className="form-error">{formErrors.items[idx].product_id}</div>}
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '11px' }}>Qty</label>
              <input
                type="number" min="1"
                value={item.quantity}
                onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                className={formErrors.items?.[idx]?.quantity ? 'input-error' : ''}
              />
              {formErrors.items?.[idx]?.quantity && <div className="form-error">{formErrors.items[idx].quantity}</div>}
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '11px' }}>Subtotal</label>
              <input value={`$${getLineSubtotal(item).toFixed(2)}`} disabled style={{ color: 'var(--accent-primary)' }} />
            </div>
            <button
              className="btn-icon danger"
              onClick={() => removeItemRow(idx)}
              disabled={orderItems.length <= 1}
              title="Remove item"
              style={{ marginBottom: '2px' }}
            >
              <HiOutlineMinus />
            </button>
          </div>
        ))}

        <button className="btn btn-secondary btn-sm" onClick={addItemRow} style={{ marginTop: '4px' }} id="add-order-item-btn">
          <HiOutlinePlus /> Add Item
        </button>

        <div className="order-total">
          <span className="order-total-label">Grand Total</span>
          <span className="order-total-value">${grandTotal.toFixed(2)}</span>
        </div>
      </Modal>

      {/* View Order Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Order Details"
        wide
        footer={<button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>}
      >
        {viewing && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Order ID', value: <span className="text-mono" style={{ fontSize: '12px' }}>{viewing.id}</span> },
                { label: 'Customer', value: <strong>{viewing.customer_name}</strong> },
                { label: 'Date', value: formatDate(viewing.created_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
                  <div>{value}</div>
                </div>
              ))}
            </div>

            <div className="table-container">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewing.items?.map((item, i) => (
                      <tr key={i}>
                        <td><strong>{item.product_name || '—'}</strong></td>
                        <td className="text-mono">{item.product_sku || '—'}</td>
                        <td>{item.quantity}</td>
                        <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                        <td><strong>${(item.quantity * parseFloat(item.unit_price)).toFixed(2)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="order-total" style={{ marginTop: '16px' }}>
              <span className="order-total-label">Total Price</span>
              <span className="order-total-value">${parseFloat(viewing.total_amount).toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirm */}
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Cancel Order"
        message={`Cancel order ${shortId(deleting?.id || '')} for ${deleting?.customer_name}?`}
        confirmLabel="Cancel Order"
        note="✓ Stock will be automatically restored"
        submitting={submitting}
        danger
      />
    </div>
  );
}
