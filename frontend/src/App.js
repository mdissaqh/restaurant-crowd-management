import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './components/Login';
import CustomerShop from './components/CustomerShop';
import CartPage from './components/CartPage';
import CustomerOrders from './components/CustomerOrders';
import AdminDashboard from './components/AdminDashboard';

import './App.css';

export default function App() {
  const user = JSON.parse(localStorage.getItem('user'));
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/shop" element={user ? <CustomerShop /> : <Navigate to="/login" />} />
        <Route path="/cart" element={user ? <CartPage /> : <Navigate to="/login" />} />
        <Route path="/my-orders" element={user ? <CustomerOrders /> : <Navigate to="/login" />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to={user ? '/shop' : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}
