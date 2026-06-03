import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  HiOutlineViewGrid,
  HiOutlineCube,
  HiOutlineUserGroup,
  HiOutlineClipboardList,
  HiOutlineMenu,
  HiOutlineX
} from 'react-icons/hi';

const navItems = [
  { path: '/', label: 'Dashboard', icon: HiOutlineViewGrid },
  { path: '/products', label: 'Products', icon: HiOutlineCube },
  { path: '/customers', label: 'Customers', icon: HiOutlineUserGroup },
  { path: '/orders', label: 'Orders', icon: HiOutlineClipboardList },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close on ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <button
        className="mobile-toggle"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        id="sidebar-toggle"
      >
        {mobileOpen ? <HiOutlineX /> : <HiOutlineMenu />}
      </button>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">I</div>
            <div className="sidebar-logo-text">
              <h1>Inventory</h1>
              <p>Order Management</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              id={`nav-${label.toLowerCase()}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div>Inventory Manager</div>
          <div style={{ marginTop: '2px', opacity: 0.6 }}>v1.0.0</div>
        </div>
      </aside>
    </>
  );
}
