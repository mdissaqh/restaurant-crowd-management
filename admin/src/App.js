import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminNavbar from './components/AdminNavbar';
import EarningsPage from './components/EarningsPage';
import MenuManagementPage from './components/MenuManagementPage';
import OrdersPage from './components/OrdersPage';
import ServiceTogglePage from './components/ServiceTogglePage';
import SettingsPage from './components/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AdminNavbar />

      <div className="container mt-4">
        <Routes>
          <Route path="earnings"       element={<EarningsPage />} />
          <Route path="menu"           element={<MenuManagementPage />} />
          <Route path="orders"         element={<OrdersPage />} />
          <Route path="service-toggle" element={<ServiceTogglePage />} />
          <Route path="settings"       element={<SettingsPage />} />
          <Route path="*"              element={<Navigate to="earnings" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
