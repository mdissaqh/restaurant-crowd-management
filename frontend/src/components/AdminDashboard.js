// frontend/src/components/AdminDashboard.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { formatDate } from '../utils/formatDate';

export default function AdminDashboard() {
  const [menu, setMenu]             = useState([]);
  const [orders, setOrders]         = useState([]);
  const [stats, setStats]           = useState({ today: 0, week: 0 });
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd]     = useState('');
  const [rangeTotal, setRangeTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings]     = useState({
    dineInEnabled: true,
    takeawayEnabled: true,
    deliveryEnabled: true,
    cafeClosed: false,
    showNotes: false,
    note: ''
  });

  const todayStr = new Date().toISOString().slice(0,10);

  useEffect(() => {
    fetchMenu();
    fetchOrders();
    axios.get('http://localhost:3001/api/settings').then(r => setSettings(r.data));

    const sock = io('http://localhost:3001');
    sock.on('newOrder', fetchOrders);
    sock.on('orderUpdated', fetchOrders);
    sock.on('settingsUpdated', s => setSettings(s));
    return () => sock.disconnect();
  }, []);

  function fetchMenu() {
    axios.get('http://localhost:3001/api/menu').then(r => {
      setMenu(r.data);
      setCategories([...new Set(r.data.map(i => i.category))]);
    });
  }

  function fetchOrders() {
    axios.get('http://localhost:3001/api/orders').then(r => {
      setOrders(r.data);
      calcStats(r.data);
    });
  }

  function calcStats(list) {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    setStats({
      today: list.filter(o => new Date(o.createdAt) >= startToday).reduce((s, o) => s + o.total, 0),
      week:  list.filter(o => new Date(o.createdAt) >= weekAgo).reduce((s, o) => s + o.total, 0)
    });
  }

  function calcRange() {
    if (!rangeStart || !rangeEnd) return;
    const s = new Date(rangeStart); s.setHours(0,0,0,0);
    const e = new Date(rangeEnd);   e.setHours(23,59,59,999);
    setRangeTotal(
      orders.filter(o => {
        const t = new Date(o.createdAt);
        return t >= s && t <= e;
      }).reduce((s, o) => s + o.total, 0)
    );
  }

  function addMenu(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newCat = fd.get('newCategory').trim();
    fd.set('category', newCat || fd.get('existingCategory'));
    axios.post('http://localhost:3001/api/menu', fd).then(() => {
      e.target.reset();
      fetchMenu();
    });
  }

  function delMenu(id) {
    axios.delete(`http://localhost:3001/api/menu/${id}`).then(fetchMenu);
  }

  function updateStatus(o) {
    const flow = o.serviceType !== 'Delivery'
      ? ['Pending','In Progress','Ready','Completed']
      : ['Pending','In Progress','Ready for Pickup','Out for Delivery','Delivered'];
    const idx = flow.indexOf(o.status);
    if (idx < 0 || idx === flow.length - 1) return;
    const next = flow[idx + 1];
    const payload = { id: o._id, status: next };
    if (next === 'In Progress') {
      const mins = prompt('Enter estimated time (minutes):');
      if (!mins) return;
      payload.estimatedTime = mins;
    }
    axios.post('http://localhost:3001/api/order/update', payload).then(fetchOrders);
  }

  function cancelOrder(o) {
    const note = prompt('Enter cancellation reason:');
    if (note == null) return;
    axios.post('http://localhost:3001/api/order/update', {
      id: o._id,
      status: 'Cancelled',
      cancellationNote: note
    }).then(fetchOrders);
  }

  function updateSetting(key, value) {
    axios.post('http://localhost:3001/api/settings', { [key]: value })
      .then(r => setSettings(r.data));
  }

  return (
    <div className="container py-4">
      <h2>Admin Dashboard</h2>

      {/* Earnings */}
      <section className="mb-4">
        <h4>Earnings</h4>
        <p><strong>Today:</strong> ₹{stats.today.toFixed(2)}</p>
        <p><strong>This Week:</strong> ₹{stats.week.toFixed(2)}</p>
        <div className="d-flex mb-2">
          <input type="date" className="form-control me-2" value={rangeStart} max={todayStr} onChange={e => setRangeStart(e.target.value)} />
          <input type="date" className="form-control me-2" value={rangeEnd}   max={todayStr} onChange={e => setRangeEnd(e.target.value)} />
          <button className="btn btn-secondary" onClick={calcRange}>Compute Range</button>
        </div>
        {rangeStart && rangeEnd && (
          <p><strong>Total from {rangeStart} to {rangeEnd}:</strong> ₹{rangeTotal.toFixed(2)}</p>
        )}
      </section>

      {/* Menu Management */}
      <section className="mb-5">
        <h4>Menu Management</h4>
        <form onSubmit={addMenu} className="mb-3 d-flex">
          <input name="name" placeholder="Item Name" required className="form-control me-2" />
          <input name="price" type="number" placeholder="Price" required className="form-control me-2" />
          <select name="existingCategory" className="form-control me-2">
            <option value="">Select existing category</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input name="newCategory" placeholder="Or type new category" className="form-control me-2" />
          <input name="image" type="file" required className="form-control me-2" />
          <button className="btn btn-sm btn-primary">Add Item</button>
        </form>
        {categories.map(cat => (
          <div key={cat} className="mb-3">
            <h5>{cat}</h5>
            <ul className="list-group">
              {menu.filter(i => i.category === cat).map(i => (
                <li key={i._id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{i.name} — ₹{i.price.toFixed(2)}</span>
                  <button className="btn btn-sm btn-danger" onClick={() => delMenu(i._id)}>Delete</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Current Orders */}
      <section className="mb-5">
        <h4>Current Orders</h4>
        {orders.filter(o => !['Completed','Delivered','Cancelled'].includes(o.status)).map(o => (
          <div key={o._id} className="card mb-2 p-3">
            <div><strong>Order ID:</strong> {o._id} — {o.name} ({o.mobile})</div>
            <div><strong>Placed:</strong> {formatDate(o.createdAt)} {new Date(o.createdAt).toLocaleTimeString()}</div>
            {o.serviceType==='Delivery' && <div><strong>Address:</strong> {o.address}</div>}
            <ul>{o.items.map(i => <li key={i.id}>{i.name} × {i.qty} = ₹{i.price * i.qty}</li>)}</ul>
            <div><strong>Total:</strong> ₹{o.total.toFixed(2)}</div>
            <div><strong>Status:</strong> {o.status}{o.estimatedTime && <> — ET: {o.estimatedTime} min</>}</div>
            <button className="btn btn-sm btn-info me-2" onClick={() => updateStatus(o)}>Next Status</button>
            <button className="btn btn-sm btn-danger" onClick={() => cancelOrder(o)}>Cancel Order</button>
          </div>
        ))}
      </section>

      {/* Settings Panel */}
      <section className="mb-5">
        <h4>Site Settings</h4>

        {['dineIn','takeaway','delivery'].map(type => (
          <div className="form-check" key={type}>
            <input
              id={`${type}Toggle`}
              type="checkbox"
              className="form-check-input"
              checked={settings[`${type}Enabled`]}
              onChange={e => updateSetting(`${type}Enabled`, e.target.checked)}
            />
            <label htmlFor={`${type}Toggle`} className="form-check-label">
              Enable {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          </div>
        ))}

        <div className="form-check">
          <input
            id="cafeClosedToggle"
            type="checkbox"
            className="form-check-input"
            checked={settings.cafeClosed}
            onChange={e => updateSetting('cafeClosed', e.target.checked)}
          />
          <label htmlFor="cafeClosedToggle" className="form-check-label">
            Cafe Closed
          </label>
        </div>

        <div className="form-check mt-2">
          <input
            id="showNotesToggle"
            type="checkbox"
            className="form-check-input"
            checked={settings.showNotes}
            onChange={e => updateSetting('showNotes', e.target.checked)}
          />
          <label htmlFor="showNotesToggle" className="form-check-label">
            Enable customer notes display
          </label>
        </div>

        <div className="mt-2">
          <label htmlFor="settingsNote" className="form-label">Global Note</label>
          <textarea
            id="settingsNote"
            className="form-control"
            rows={2}
            value={settings.note}
            onChange={e => updateSetting('note', e.target.value)}
          />
        </div>
      </section>

      {/* Completed & Cancelled Orders */}
      <section>
        <h4>Completed & Cancelled Orders</h4>
        <ul className="list-group">
          {orders.filter(o => ['Completed','Delivered','Cancelled'].includes(o.status)).map(o => (
            <li key={o._id} className="list-group-item">
              <div><strong>Order ID:</strong> {o._id} — {o.name}</div>
              <div><strong>Placed:</strong> {formatDate(o.createdAt)} {new Date(o.createdAt).toLocaleTimeString()}</div>
              <div><strong>Completed:</strong> {o.completedAt ? `${formatDate(o.completedAt)} ${new Date(o.completedAt).toLocaleTimeString()}` : '—'}</div>
              <ul>{o.items.map(i => <li key={i.id}>{i.name} × {i.qty} = ₹{i.price * i.qty}</li>)}</ul>
              <div><strong>Total:</strong> ₹{o.total.toFixed(2)}</div>
              <div><strong>Status:</strong> {o.status}</div>
              {o.status === 'Cancelled' && o.cancellationNote && (
                <div className="mt-2 alert alert-danger">
                  <strong>Cancellation Reason:</strong> {o.cancellationNote}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
);
}
