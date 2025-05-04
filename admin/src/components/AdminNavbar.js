import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaChartLine, FaUtensils, FaClipboardList, FaToggleOn, FaCog } from 'react-icons/fa';

export default function AdminNavbar() {
  const links = [
    { to: 'earnings',       icon: <FaChartLine />,    label: 'Earnings' },
    { to: 'menu',           icon: <FaUtensils />,      label: 'Menu' },
    { to: 'orders',         icon: <FaClipboardList />, label: 'Orders' },
    { to: 'service-toggle', icon: <FaToggleOn />,      label: 'Services' },
    { to: 'settings',       icon: <FaCog />,           label: 'Settings' },
  ];

  return (
    <nav className="navbar navbar-expand bg-light">
      <div className="container">
        <span className="navbar-brand">Admin Panel</span>
        <ul className="navbar-nav">
          {links.map(l => (
            <li key={l.to} className="nav-item">
              <NavLink
                to={l.to}
                className="nav-link"
                style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}
              >
                {l.icon} <span className="ms-1">{l.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
