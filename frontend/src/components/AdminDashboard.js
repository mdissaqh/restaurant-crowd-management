// frontend/src/components/AdminDashboard.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { formatDate } from '../utils/formatDate';

// Icons
import {
  FaDollarSign,
  FaClipboardList,
  FaCheckCircle,
  FaUtensils,
  FaStar,
  FaCog
} from 'react-icons/fa';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('earnings');
  const [menu, setMenu]             = useState([]);
  const [orders, setOrders]         = useState([]);
  const [earningStats, setEarningStats] = useState({
    today: 0, week: 0, month: 0, year: 0
  });
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
  const [feedbackStats, setFeedbackStats] = useState({
    overall: 0, week: 0, month: 0, year: 0, count: 0
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

  // --- Data fetchers & calculators ---
  function fetchMenu() {
    axios.get('http://localhost:3001/api/menu').then(r => {
      setMenu(r.data);
      setCategories([...new Set(r.data.map(i => i.category))]);
    });
  }

  function fetchOrders() {
    axios.get('http://localhost:3001/api/orders').then(r => {
      setOrders(r.data);
      calcEarningsStats(r.data);
      calcRange(r.data);
      calcFeedbackStats(r.data);
    });
  }

  function calcEarningsStats(list) {
    const completed = list.filter(o => ['Completed','Delivered'].includes(o.status));
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySum = completed.filter(o => new Date(o.completedAt) >= startToday)
                              .reduce((s,o)=>s+o.total,0);
    const day = now.getDay();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()-day);
    const weekEnd   = new Date(weekStart.getTime()+6*86400000);
    const weekSum = completed.filter(o=>{const d=new Date(o.completedAt);return d>=weekStart&&d<=weekEnd})
                             .reduce((s,o)=>s+o.total,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(),1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth()+1,0,23,59,59);
    const monthSum = completed.filter(o=>{const d=new Date(o.completedAt);return d>=monthStart&&d<=monthEnd})
                              .reduce((s,o)=>s+o.total,0);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd   = new Date(now.getFullYear(),11,31,23,59,59);
    const yearSum = completed.filter(o=>{const d=new Date(o.completedAt);return d>=yearStart&&d<=yearEnd})
                             .reduce((s,o)=>s+o.total,0);
    setEarningStats({ today: todaySum, week: weekSum, month: monthSum, year: yearSum });
  }

  function calcRange(list) {
    if(!rangeStart||!rangeEnd) return;
    const s=new Date(rangeStart); s.setHours(0,0,0,0);
    const e=new Date(rangeEnd);   e.setHours(23,59,59,999);
    const sum = list
      .filter(o => ['Completed','Delivered'].includes(o.status))
      .filter(o => {
        const d = new Date(o.completedAt);
        return d >= s && d <= e;
      })
      .reduce((s,o) => s + o.total, 0);
    setRangeTotal(sum);
  }

  function calcFeedbackStats(list) {
    const now = new Date();
    const day = now.getDay();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()-day);
    const weekEnd   = new Date(weekStart.getTime()+6*86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(),1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth()+1,0,23,59,59);
    const yearStart  = new Date(now.getFullYear(),0,1);
    const yearEnd    = new Date(now.getFullYear(),11,31,23,59,59);

    const rated = list.filter(o => o.rating != null);
    const avg = arr => arr.length ? arr.reduce((s,o) => s + o.rating, 0) / arr.length : 0;

    setFeedbackStats({
      overall: avg(rated),
      week:    avg(rated.filter(o => {
                  const d = new Date(o.completedAt);
                  return d >= weekStart && d <= weekEnd;
                })),
      month:   avg(rated.filter(o => {
                  const d = new Date(o.completedAt);
                  return d >= monthStart && d <= monthEnd;
                })),
      year:    avg(rated.filter(o => {
                  const d = new Date(o.completedAt);
                  return d >= yearStart && d <= yearEnd;
                })),
      count: rated.length
    });
  }

  // --- Handlers ---
  function addMenu(e){ 
    e.preventDefault();  
    const fd = new FormData(e.target);
    const newCat = fd.get('newCategory').trim();
    fd.set('category', newCat || fd.get('existingCategory'));
    axios.post('http://localhost:3001/api/menu', fd)
         .then(() => { e.target.reset(); fetchMenu(); });
  }
  function delMenu(id){ axios.delete(`http://localhost:3001/api/menu/${id}`).then(fetchMenu); }
  function updateStatus(o){
    const flow = o.serviceType !== 'Delivery'
      ? ['Pending','In Progress','Ready','Completed']
      : ['Pending','In Progress','Ready for Pickup','Out for Delivery','Delivered'];
    const idx = flow.indexOf(o.status);
    if (idx < 0 || idx === flow.length-1) return;
    const next = flow[idx+1];
    const payload = { id: o._id, status: next };
    if (next === 'In Progress') {
      const mins = prompt('Enter estimated time (minutes):');
      if (!mins) return;
      payload.estimatedTime = mins;
    }
    axios.post('http://localhost:3001/api/order/update', payload)
         .then(fetchOrders);
  }
  function cancelOrder(o){
    const note = prompt('Enter cancellation reason:');
    if (note == null) return;
    axios.post('http://localhost:3001/api/order/update', {
      id: o._id,
      status: 'Cancelled',
      cancellationNote: note
    }).then(fetchOrders);
  }
  function updateSetting(k,v){
    axios.post('http://localhost:3001/api/settings', { [k]: v })
         .then(r => setSettings(r.data));
  }

  // --- Render ---
  return (
    <div className="d-flex" style={{minHeight:'100vh'}}>
      {/* Sidebar */}
      <nav className="bg-light p-3" style={{width:200}}>
        <ul className="list-unstyled">
          <li className={`mb-3 ${activeTab==='earnings' && 'fw-bold'}`}
              onClick={() => setActiveTab('earnings')}
              style={{cursor:'pointer'}}>
            <FaDollarSign className="me-2"/> Earnings
          </li>
          <li className={`mb-3 ${activeTab==='active' && 'fw-bold'}`}
              onClick={() => setActiveTab('active')}
              style={{cursor:'pointer'}}>
            <FaClipboardList className="me-2"/> Active Orders
          </li>
          <li className={`mb-3 ${activeTab==='completed' && 'fw-bold'}`}
              onClick={() => setActiveTab('completed')}
              style={{cursor:'pointer'}}>
            <FaCheckCircle className="me-2"/> Completed & Cancelled Orders
          </li>
          <li className={`mb-3 ${activeTab==='menu' && 'fw-bold'}`}
              onClick={() => setActiveTab('menu')}
              style={{cursor:'pointer'}}>
            <FaUtensils className="me-2"/> Menu Management
          </li>
          <li className={`mb-3 ${activeTab==='feedback' && 'fw-bold'}`}
              onClick={() => setActiveTab('feedback')}
              style={{cursor:'pointer'}}>
            <FaStar className="me-2"/> Feedback & Ratings
          </li>
          <li className={`mb-3 ${activeTab==='settings' && 'fw-bold'}`}
              onClick={() => setActiveTab('settings')}
              style={{cursor:'pointer'}}>
            <FaCog className="me-2"/> Settings
          </li>
        </ul>
      </nav>

      {/* Main Content */}
      <div className="flex-grow-1 p-4">

        {/* Earnings Tab */}
        {activeTab==='earnings' && (
          <section>
            <h3><FaDollarSign className="me-2"/> Earnings</h3>
            <p><strong>Today:</strong> ₹{earningStats.today.toFixed(2)}</p>
            <p><strong>This Week:</strong> ₹{earningStats.week.toFixed(2)}</p>
            <p><strong>This Month:</strong> ₹{earningStats.month.toFixed(2)}</p>
            <p><strong>This Year:</strong> ₹{earningStats.year.toFixed(2)}</p>
            <div className="d-flex mb-2">
              <input
                type="date"
                className="form-control me-2"
                value={rangeStart}
                max={todayStr}
                onChange={e => setRangeStart(e.target.value)}
              />
              <input
                type="date"
                className="form-control me-2"
                value={rangeEnd}
                max={todayStr}
                onChange={e => setRangeEnd(e.target.value)}
              />
              <button className="btn btn-secondary" onClick={() => calcRange(orders)}>
                Compute Range
              </button>
            </div>
            {rangeStart && rangeEnd && (
              <p>
                <strong>Total from {rangeStart} to {rangeEnd}:</strong> ₹{rangeTotal.toFixed(2)}
              </p>
            )}
          </section>
        )}

        {/* Active Orders Tab with "No active orders" message */}
        {activeTab==='active' && (
          <section>
            <h3><FaClipboardList className="me-2"/> Active Orders</h3>
            {(() => {
              const activeOrders = orders.filter(o => !['Completed','Delivered','Cancelled'].includes(o.status));
              if (activeOrders.length === 0) {
                return <p>No active orders</p>;
              }
              return activeOrders.map(o => (
                <div key={o._id} className="card mb-2 p-3">
                  <div><strong>Order ID:</strong> {o._id} — {o.name} ({o.mobile})</div>
                  <div><strong>Placed:</strong> {formatDate(o.createdAt)}</div>
                  {o.serviceType==='Delivery' && (
                    <div><strong>Address:</strong> {o.address}</div>
                  )}
                  <ul>
                    {o.items.map(i => (
                      <li key={i.id}>{i.name} × {i.qty} = ₹{(i.price*i.qty).toFixed(2)}</li>
                    ))}
                  </ul>
                  <div><strong>Total:</strong> ₹{o.total.toFixed(2)}</div>
                  <div><strong>Status:</strong> {o.status}</div>
                  <button className="btn btn-sm btn-info me-2" onClick={() => updateStatus(o)}>
                    Next Status
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => cancelOrder(o)}>
                    Cancel Order
                  </button>
                </div>
              ));
            })()}
          </section>
        )}

        {/* Completed & Cancelled Orders Tab */}
        {activeTab==='completed' && (
          <section>
            <h3><FaCheckCircle className="me-2"/> Completed & Cancelled Orders</h3>
            {orders
              .filter(o => ['Completed','Delivered','Cancelled'].includes(o.status))
              .map(o => (
                <div key={o._id} className="card mb-2 p-3">
                  <div><strong>Order ID:</strong> {o._id} — {o.name} ({o.mobile})</div>
                  <div><strong>Placed:</strong> {formatDate(o.createdAt)}</div>
                  <div><strong>Completed:</strong> {formatDate(o.completedAt)}</div>
                  <ul>
                    {o.items.map(i => (
                      <li key={i.id}>{i.name} × {i.qty} = ₹{(i.price*i.qty).toFixed(2)}</li>
                    ))}
                  </ul>
                  <div><strong>Total:</strong> ₹{o.total.toFixed(2)}</div>
                  <div><strong>Status:</strong> {o.status}</div>
                  {o.status==='Cancelled' && o.cancellationNote && (
                    <div><strong>Cancellation Reason:</strong> {o.cancellationNote}</div>
                  )}
                </div>
              ))
            }
          </section>
        )}

        {/* Menu Management Tab */}
        {activeTab==='menu' && (
          <section>
            <h3><FaUtensils className="me-2"/> Menu Management</h3>
            <form onSubmit={addMenu} className="mb-3 d-flex">
              <input name="name" placeholder="Item Name" required className="form-control me-2" />
              <input name="price" type="number" placeholder="Price" required className="form-control me-2" />
              <select name="existingCategory" className="form-control me-2">
                <option value="">Select existing category</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
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
                    <li key={i._id} className="list-group-item d-flex justify-content-between">
                      {i.name} — ₹{i.price.toFixed(2)}
                      <button className="btn btn-sm btn-danger" onClick={() => delMenu(i._id)}>
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {/* Feedback & Ratings Tab */}
        {activeTab==='feedback' && (
          <section>
            <h3><FaStar className="me-2"/> Feedback & Ratings</h3>
            <p>
              <strong>Overall:</strong> {feedbackStats.overall.toFixed(2)} ★ &nbsp;
              <strong>Last 7 days:</strong> {feedbackStats.week.toFixed(2)} ★ &nbsp;
              <strong>This month:</strong> {feedbackStats.month.toFixed(2)} ★ &nbsp;
              <strong>This year:</strong> {feedbackStats.year.toFixed(2)} ★ &nbsp;
              <span className="text-muted">({feedbackStats.count} ratings)</span>
            </p>
            <ul className="list-group">
              {orders.filter(o => o.rating != null)
                     .sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt))
                     .map(o => (
                <li key={o._id} className="list-group-item">
                  <div><strong>Order ID:</strong> {o._id} — {o.name} ({o.mobile})</div>
                  <div><strong>Placed:</strong> {formatDate(o.createdAt)}</div>
                  <ul className="mb-1">
                    {o.items.map(i => (
                      <li key={i.id}>{i.name} × {i.qty} = ₹{(i.price*i.qty).toFixed(2)}</li>
                    ))}
                  </ul>
                  <div><strong>Total:</strong> ₹{o.total.toFixed(2)}</div>
                  <div><strong>Status:</strong> {o.status}</div>
                  <div className="mt-1">
                    {'★'.repeat(o.rating)}{'☆'.repeat(5-o.rating)}
                    {o.feedback && <p className="mt-1">“{o.feedback}”</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Settings Tab */}
        {activeTab==='settings' && (
          <section>
            <h3><FaCog className="me-2"/> Settings</h3>
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
        )}

      </div>
    </div>
  );
}
