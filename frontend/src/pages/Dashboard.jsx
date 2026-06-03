import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineCube, HiOutlineUserGroup,
  HiOutlineClipboardList, HiOutlineExclamation,
  HiOutlineArrowRight
} from 'react-icons/hi';
import { getDashboardStats } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const { data } = await getDashboardStats();
      setStats(data);
    } catch {
      setError('Failed to load dashboard. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error) return (
    <div className="alert-banner danger" style={{ marginTop: '40px' }}>
      <HiOutlineExclamation style={{ fontSize: '20px', flexShrink: 0 }} />
      {error}
    </div>
  );

  const lowCount = stats?.low_stock_products?.length ?? 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Dashboard</h2>
          <p>Overview of your inventory and orders</p>
        </div>
      </div>

      {/* Low-stock alert banner */}
      {lowCount > 0 && (
        <div className="alert-banner warning">
          <HiOutlineExclamation style={{ fontSize: '20px', flexShrink: 0 }} />
          <span>
            <strong>{lowCount} product{lowCount > 1 ? 's' : ''}</strong> running low on stock — check the table below.
          </span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card products">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Products</span>
            <div className="stat-card-icon"><HiOutlineCube /></div>
          </div>
          <div className="stat-card-value">{stats?.total_products ?? 0}</div>
          <div className="stat-card-sub">In your catalog</div>
        </div>

        <div className="stat-card customers">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Customers</span>
            <div className="stat-card-icon"><HiOutlineUserGroup /></div>
          </div>
          <div className="stat-card-value">{stats?.total_customers ?? 0}</div>
          <div className="stat-card-sub">Registered accounts</div>
        </div>

        <div className="stat-card orders">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Orders</span>
            <div className="stat-card-icon"><HiOutlineClipboardList /></div>
          </div>
          <div className="stat-card-value">{stats?.total_orders ?? 0}</div>
          <div className="stat-card-sub">All time</div>
        </div>

        <div className="stat-card lowstock">
          <div className="stat-card-header">
            <span className="stat-card-label">Low Stock Product</span>
            <div className="stat-card-icon"><HiOutlineExclamation /></div>
          </div>
          <div className="stat-card-value">{lowCount}</div>
          <div className="stat-card-sub">Quantity ≤ 10</div>
        </div>
      </div>

      {/* Low Stock Table */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div className="page-header-left">
          <h2 style={{ fontSize: '18px' }}>Low Stock Products</h2>
          <p>Products with quantity ≤ 10</p>
        </div>
        <Link to="/products" className="btn btn-secondary btn-sm" id="view-all-products-btn">
          View All <HiOutlineArrowRight />
        </Link>
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Price per Piece</th>
                <th>Quantity</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              {lowCount === 0 ? (
                <tr>
                  <td colSpan="5" className="table-empty">
                    🎉 All products are well-stocked!
                  </td>
                </tr>
              ) : (
                stats.low_stock_products.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td className="text-mono">{p.sku}</td>
                    <td>${parseFloat(p.price).toFixed(2)}</td>
                    <td>
                      <strong style={{ color: p.quantity <= 5 ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>
                        {p.quantity}
                      </strong>
                      <span className={`badge ${p.quantity <= 5 ? 'badge-danger' : 'badge-warning'}`} style={{ marginLeft: '8px' }}>
                        {p.quantity <= 5 ? 'Critical' : 'Low'}
                      </span>
                    </td>
                    <td>
                      <strong>${(parseFloat(p.price) * parseInt(p.quantity)).toFixed(2)}</strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
