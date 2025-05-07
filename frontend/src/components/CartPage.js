// frontend/src/components/CartPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

export default function CartPage() {
  const [menu, setMenu]                 = useState([]);
  const [cart, setCart]                 = useState(() => JSON.parse(localStorage.getItem('cart') || '{}'));
  const [serviceType, setServiceType]   = useState('Dine-in');
  const [address, setAddress]           = useState('');
  const [settings, setSettings]         = useState({
    dineInEnabled: true,
    takeawayEnabled: true,
    deliveryEnabled: true,
    cafeClosed: false,
    showNotes: false,
    note: ''
  });

  const user     = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:3001/api/menu').then(r => setMenu(r.data));
    axios.get('http://localhost:3001/api/settings').then(r => setSettings(r.data));
    const sock = io('http://localhost:3001');
    sock.on('settingsUpdated', s => setSettings(s));
    return () => sock.disconnect();
  }, []);

  const items = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const m = menu.find(x => x._id === id) || {};
      return { ...m, qty };
    });

  const total = items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);

  const canCheckout =
    !settings.cafeClosed &&
    ((serviceType === 'Dine-in' && settings.dineInEnabled) ||
     (serviceType === 'Takeaway' && settings.takeawayEnabled) ||
     (serviceType === 'Delivery' && settings.deliveryEnabled));

  const submitOrder = async e => {
    e.preventDefault();
    if (!items.length) return alert('Cart is empty');
    if (!canCheckout) return alert(settings.note || 'Service unavailable');
    const payload = {
      name: user.name,
      mobile: user.mobile,
      email: '',
      serviceType,
      address: serviceType === 'Delivery' ? address : '',
      items: items.map(i => ({ id: i._id, qty: i.qty }))
    };
    try {
      await axios.post('http://localhost:3001/api/order', payload);
      localStorage.removeItem('cart');
      alert('Order placed!');
      navigate('/my-orders');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to place order');
    }
  };

  return (
    <div className="container py-4">
      <h2>Your Cart</h2>

      {items.map(i => (
        <div key={i._id} className="d-flex justify-content-between mb-2">
          <span>{i.name} × {i.qty}</span>
          <span>₹{(i.price * i.qty).toFixed(2)}</span>
        </div>
      ))}

      <div className="d-flex justify-content-between fw-bold mb-3">
        <span>Total:</span>
        <span>₹{total.toFixed(2)}</span>
      </div>

      {settings.showNotes && (
        <>
          {settings.cafeClosed ? (
            <div className="alert alert-warning">{settings.note || 'Cafe is closed'}</div>
          ) : (
            <>
              {!settings.dineInEnabled && <div className="alert alert-warning">Dine-in disabled: {settings.note}</div>}
              {!settings.takeawayEnabled && <div className="alert alert-warning">Takeaway disabled: {settings.note}</div>}
              {!settings.deliveryEnabled && <div className="alert alert-warning">Delivery disabled: {settings.note}</div>}
            </>
          )}
        </>
      )}

      <div className="mb-3">
        <label>Service:</label>
        <select
          className="form-select"
          value={serviceType}
          onChange={e => setServiceType(e.target.value)}
          disabled={settings.cafeClosed}
        >
          <option value="Dine-in" disabled={!settings.dineInEnabled}>Dine-in</option>
          <option value="Takeaway" disabled={!settings.takeawayEnabled}>Takeaway</option>
          <option value="Delivery" disabled={!settings.deliveryEnabled}>Delivery</option>
        </select>
      </div>

      {serviceType === 'Delivery' && (
        <div className="mb-3">
          <label>Delivery Address</label>
          <textarea
            className="form-control"
            required
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>
      )}

      <button
        className="btn btn-success"
        onClick={submitOrder}
        disabled={!items.length || !canCheckout}
      >
        Checkout
      </button>
    </div>
  );
}
