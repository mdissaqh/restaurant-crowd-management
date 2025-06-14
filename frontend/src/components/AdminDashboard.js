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
  FaCog,
  FaChartBar,
  FaTasks,
  FaSave
} from 'react-icons/fa';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('earnings');
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [earningStats, setEarningStats] = useState({ today: 0, week: 0, month: 0, year: 0 });
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeTotal, setRangeTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({
    dineInEnabled: true,
    takeawayEnabled: true,
    deliveryEnabled: true,
    cafeClosed: false,
    showNotes: false,
    note: '',
    cgstPercent: 0,
    sgstPercent: 0,
    deliveryCharge: 0
  });
  const [feedbackStats, setFeedbackStats] = useState({ overall: 0, week: 0, month: 0, year: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const [savingSuccess, setSavingSuccess] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetchMenu();
    fetchOrders();
    axios.get('http://localhost:3001/api/settings')
      .then(r => {
        // Ensure we always have a valid settings object
        const validSettings = {
          dineInEnabled: true,
          takeawayEnabled: true,
          deliveryEnabled: true,
          cafeClosed: false,
          showNotes: false,
          note: '',
          cgstPercent: 0,
          sgstPercent: 0,
          deliveryCharge: 0,
          ...r.data // Spread the API response to override defaults
        };
        setSettings(validSettings);
      })
      .catch(console.error);
    
    const sock = io('http://localhost:3001');
    sock.on('newOrder', fetchOrders);
    sock.on('orderUpdated', fetchOrders);
    sock.on('settingsUpdated', s => {
      // Ensure we always have a valid settings object
      const validSettings = {
        dineInEnabled: true,
        takeawayEnabled: true,
        deliveryEnabled: true,
        cafeClosed: false,
        showNotes: false,
        note: '',
        cgstPercent: 0,
        sgstPercent: 0,
        deliveryCharge: 0,
        ...s // Spread the socket response to override defaults
      };
      setSettings(validSettings);
    });
    return () => sock.disconnect();
  }, []);

  // --- Fetchers ---
  function fetchMenu() {
    setLoading(true);
    axios.get('http://localhost:3001/api/menu')
      .then(r => {
        setMenu(r.data);
        setCategories([...new Set(r.data.map(i => i.category))]);
        setLoading(false);
      })
      .catch(error => {
        console.error(error);
        setLoading(false);
      });
  }

  function fetchOrders() {
    setLoading(true);
    axios.get('http://localhost:3001/api/orders')
      .then(r => {
        setOrders(r.data);
        calcEarningsStats(r.data);
        calcRange(r.data);
        calcFeedbackStats(r.data);
        setLoading(false);
      })
      .catch(error => {
        console.error(error);
        setLoading(false);
      });
  }

  // --- Calculators ---
  function calcEarningsStats(list) {
    const completed = list.filter(o => ['Completed', 'Delivered'].includes(o.status));
    const now = new Date();
    // Today
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySum = completed
      .filter(o => new Date(o.completedAt) >= startToday)
      .reduce((s, o) => s + o.total, 0);
    // Week
    const day = now.getDay();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
    const weekSum = completed
      .filter(o => {
        const d = new Date(o.completedAt);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((s, o) => s + o.total, 0);
    // Month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const monthSum = completed
      .filter(o => {
        const d = new Date(o.completedAt);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s, o) => s + o.total, 0);
    // Year
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    const yearSum = completed
      .filter(o => {
        const d = new Date(o.completedAt);
        return d >= yearStart && d <= yearEnd;
      })
      .reduce((s, o) => s + o.total, 0);

    setEarningStats({ today: todaySum, week: weekSum, month: monthSum, year: yearSum });
  }

  function calcRange(list) {
    if (!rangeStart || !rangeEnd) return;
    const s = new Date(rangeStart); s.setHours(0, 0, 0, 0);
    const e = new Date(rangeEnd); e.setHours(23, 59, 59, 999);
    const sum = list
      .filter(o => ['Completed', 'Delivered'].includes(o.status))
      .filter(o => {
        const d = new Date(o.completedAt);
        return d >= s && d <= e;
      })
      .reduce((s, o) => s + o.total, 0);
    setRangeTotal(sum);
  }

  function calcFeedbackStats(list) {
    const now = new Date();
    const day = now.getDay();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const rated = list.filter(o => o.rating != null);
    const avg = arr => arr.length
      ? arr.reduce((s, o) => s + o.rating, 0) / arr.length
      : 0;

    setFeedbackStats({
      overall: avg(rated),
      week: avg(rated.filter(o => {
        const d = new Date(o.completedAt);
        return d >= weekStart && d <= weekEnd;
      })),
      month: avg(rated.filter(o => {
        const d = new Date(o.completedAt);
        return d >= monthStart && d <= monthEnd;
      })),
      year: avg(rated.filter(o => {
        const d = new Date(o.completedAt);
        return d >= yearStart && d <= yearEnd;
      })),
      count: rated.length
    });
  }

  // --- Handlers ---
  function addMenu(e) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    const newCat = fd.get('newCategory').trim();
    fd.set('category', newCat || fd.get('existingCategory'));
    axios.post('http://localhost:3001/api/menu', fd)
      .then(() => { 
        e.target.reset(); 
        fetchMenu();
        // Notify the client to refresh
        const sock = io('http://localhost:3001');
        sock.emit('menuUpdated');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function delMenu(id) {
    if (!window.confirm('Delete this menu item?')) return;
    setLoading(true);
    axios.delete(`http://localhost:3001/api/menu/${id}`)
      .then(() => {
        fetchMenu();
        // Notify the client to refresh
        const sock = io('http://localhost:3001');
        sock.emit('menuUpdated');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function updateStatus(o) {
    const flow = o.serviceType !== 'Delivery'
      ? ['Pending', 'In Progress', 'Ready', 'Completed']
      : ['Pending', 'In Progress', 'Ready for Pickup', 'Out for Delivery', 'Delivered'];
    const idx = flow.indexOf(o.status);
    if (idx < 0 || idx === flow.length - 1) return;
    const next = flow[idx + 1];
    const payload = { id: o._id, status: next };
    if (next === 'In Progress') {
      const mins = prompt('Enter estimated time (minutes):');
      if (!mins) return;
      payload.estimatedTime = mins;
    }
    setLoading(true);
    axios.post('http://localhost:3001/api/order/update', payload)
      .then(fetchOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function cancelOrder(o) {
    const note = prompt('Enter cancellation reason:');
    if (note == null) return;
    setLoading(true);
    axios.post('http://localhost:3001/api/order/update', {
      id: o._id,
      status: 'Cancelled',
      cancellationNote: note
    })
      .then(fetchOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function updateSetting(key, value) {
    // Ensure settings is always an object before updating
    const currentSettings = settings || {
      dineInEnabled: true,
      takeawayEnabled: true,
      deliveryEnabled: true,
      cafeClosed: false,
      showNotes: false,
      note: '',
      cgstPercent: 0,
      sgstPercent: 0,
      deliveryCharge: 0
    };
    const updatedSettings = { ...currentSettings, [key]: value };
    setSettings(updatedSettings);
  }

  function saveSettings(e) {
    e.preventDefault();
    setLoading(true);
    axios.post('http://localhost:3001/api/settings', settings)
      .then(r => {
        setSettings(r.data);
        setSavingSuccess(true);
        setTimeout(() => setSavingSuccess(false), 3000);
        
        // Notify the client to refresh
        const sock = io('http://localhost:3001');
        sock.emit('settingsUpdated');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  // parse JSON address
  const renderAddress = addr => {
    try {
      const a = JSON.parse(addr);
      return `${a.flat}, ${a.area}, ${a.landmark}, ${a.city}, ${a.pincode}, ${a.mobile}`;
    } catch {
      return addr;
    }
  };

  function getStatusBadgeClass(status) {
    const statusMap = {
      'Pending': 'status-pending',
      'In Progress': 'status-in-progress',
      'Ready': 'status-ready',
      'Ready for Pickup': 'status-ready',
      'Out for Delivery': 'status-in-progress',
      'Delivered': 'status-delivered',
      'Completed': 'status-completed',
      'Cancelled': 'status-cancelled'
    };
    return `status-badge ${statusMap[status] || ''}`;
  }

  // Ensure settings is always an object to prevent undefined errors
  const safeSettings = settings || {
    dineInEnabled: true,
    takeawayEnabled: true,
    deliveryEnabled: true,
    cafeClosed: false,
    showNotes: false,
    note: '',
    cgstPercent: 0,
    sgstPercent: 0,
    deliveryCharge: 0
  };

  return (
    <>
      {/* Branding Header */}
      <header className="admin-header d-flex align-items-center p-3">
        <img
          src="/Millennialscafe.jpg"
          alt="Millennials Cafe Logo"
          style={{ height: 40, marginRight: 12 }}
        />
        <h1 className="h4 mb-0">MILLENNIALS CAFE ADMIN</h1>
      </header>

      <div className="d-flex" style={{ minHeight: 'calc(100vh - 70px)' }}>
        {/* Sidebar */}
        <nav className="admin-sidebar" style={{ width: 250 }}>
          <ul className="list-unstyled">
            {[
              { id: 'earnings', icon: <FaDollarSign />, text: 'Earnings' },
              { id: 'active', icon: <FaTasks />, text: 'Active Orders' },
              { id: 'completed', icon: <FaCheckCircle />, text: 'Completed & Cancelled' },
              { id: 'menu', icon: <FaUtensils />, text: 'Menu Management' },
              { id: 'feedback', icon: <FaStar />, text: 'Feedback & Ratings' },
              { id: 'settings', icon: <FaCog />, text: 'Settings' }
            ].map(tab => (
              <li
                key={tab.id}
                className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.text}
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <div className="flex-grow-1 p-4">
          {loading && (
            <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 1050 }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {/* Earnings */}
          {activeTab === 'earnings' && (
            <section className="settings-container">
              <h3 className="mb-4"><FaChartBar className="me-2" />Earnings Dashboard</h3>
              
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h5 className="card-title">Today</h5>
                      <h2 className="card-text text-primary">₹{earningStats.today.toFixed(2)}</h2>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h5 className="card-title">This Week</h5>
                      <h2 className="card-text text-primary">₹{earningStats.week.toFixed(2)}</h2>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h5 className="card-title">This Month</h5>
                      <h2 className="card-text text-primary">₹{earningStats.month.toFixed(2)}</h2>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h5 className="card-title">This Year</h5>
                      <h2 className="card-text text-primary">₹{earningStats.year.toFixed(2)}</h2>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-4 mb-4">
                <h5 className="mb-3">Custom Date Range</h5>
                <div className="row align-items-end">
                  <div className="col-md-4">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={rangeStart}
                      max={todayStr}
                      onChange={e => setRangeStart(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={rangeEnd}
                      max={todayStr}
                      onChange={e => setRangeEnd(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <button 
                      className="btn btn-primary w-100" 
                      onClick={() => calcRange(orders)}
                      disabled={!rangeStart || !rangeEnd}
                    >
                      Calculate
                    </button>
                  </div>
                </div>
                
                {rangeStart && rangeEnd && (
                  <div className="mt-4 alert alert-success">
                    <h5 className="mb-0">Total from {rangeStart} to {rangeEnd}: <strong>₹{rangeTotal.toFixed(2)}</strong></h5>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Active Orders */}
          {activeTab === 'active' && (
            <section className="settings-container">
              <h3 className="mb-4"><FaTasks className="me-2" />Active Orders</h3>
              {(() => {
                const activeOrders = orders.filter(o => !['Completed','Delivered','Cancelled'].includes(o.status));
                if (!activeOrders.length) {
                  return <div className="alert alert-info">No active orders at the moment.</div>;
                }
                return (
                  <div className="row">
                    {activeOrders.map(o => {
                      const subtotal = o.items.reduce((sum, i) => sum + i.price * i.qty, 0);
                      return (
                        <div key={o._id} className="col-lg-6 mb-4">
                          <div className="card h-100">
                            <div className="card-header d-flex justify-content-between align-items-center">
                              <h5 className="mb-0">Order: {o._id.slice(-6)}</h5>
                              <div className={getStatusBadgeClass(o.status)}>{o.status}</div>
                            </div>
                            <div className="card-body">
                              <div className="mb-3">
                                <strong>Customer:</strong> {o.name} ({o.mobile})
                              </div>
                              <div className="mb-3">
                                <strong>Placed:</strong> {formatDate(o.createdAt)} {new Date(o.createdAt).toLocaleTimeString()}
                              </div>
                              <div className="mb-3">
                                <strong>Service Type:</strong> {o.serviceType}
                              </div>
                              
                              {o.serviceType === 'Delivery' && (
                                <div className="mb-3">
                                  <strong>Address:</strong> {renderAddress(o.address)}
                                </div>
                              )}
                              
                              <div className="card mb-3">
                                <div className="card-header">
                                  <strong>Order Items</strong>
                                </div>
                                <ul className="list-group list-group-flush">
                                  {o.items.map(i => (
                                    <li key={i.id} className="list-group-item d-flex justify-content-between">
                                      <span>{i.name} × {i.qty}</span>
                                      <span>₹{(i.price*i.qty).toFixed(2)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="row mb-3">
                                <div className="col-6">
                                  <strong>Subtotal:</strong> ₹{subtotal.toFixed(2)}
                                </div>
                                <div className="col-6">
                                  <strong>CGST ({safeSettings.cgstPercent}%):</strong> ₹{(o.cgstAmount||0).toFixed(2)}
                                </div>
                                <div className="col-6">
                                  <strong>SGST ({safeSettings.sgstPercent}%):</strong> ₹{(o.sgstAmount||0).toFixed(2)}
                                </div>
                                {o.serviceType === 'Delivery' && (
                                  <div className="col-6">
                                    <strong>Delivery Charge:</strong> ₹{(o.deliveryCharge||0).toFixed(2)}
                                  </div>
                                )}
                                <div className="col-12 mt-2">
                                  <h5>Total: ₹{o.total.toFixed(2)}</h5>
                                </div>
                              </div>
                              
                              {o.estimatedTime && (
                                <div className="alert alert-info mb-3">
                                  Estimated Time: {o.estimatedTime} minutes
                                </div>
                              )}
                            </div>
                            <div className="card-footer d-flex justify-content-between">
                              <button 
                                className="btn btn-primary" 
                                onClick={() => updateStatus(o)}
                              >
                                Move to {o.serviceType !== 'Delivery' 
                                  ? ['Pending', 'In Progress', 'Ready', 'Completed'] 
                                  : ['Pending', 'In Progress', 'Ready for Pickup', 'Out for Delivery', 'Delivered']
                                }[['Pending', 'In Progress', 'Ready', 'Ready for Pickup', 'Out for Delivery'].indexOf(o.status) + 1]
                              </button>
                              <button className="btn btn-danger" onClick={() => cancelOrder(o)}>Cancel</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>
          )}

          {/* Completed & Cancelled */}
          {activeTab === 'completed' && (
            <section className="settings-container">
              <h3 className="mb-4"><FaCheckCircle className="me-2" />Completed & Cancelled Orders</h3>
              {(() => {
                const completedOrders = orders.filter(o => ['Completed','Delivered','Cancelled'].includes(o.status));
                if (!completedOrders.length) {
                  return <div className="alert alert-info">No completed or cancelled orders yet.</div>;
                }
                
                return (
                  <div className="row">
                    {completedOrders.map(o => (
                      <div key={o._id} className="col-lg-6 mb-4">
                        <div className="card h-100">
                          <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Order: {o._id.slice(-6)}</h5>
                            <div className={getStatusBadgeClass(o.status)}>{o.status}</div>
                          </div>
                          <div className="card-body">
                            <div className="row mb-3">
                              <div className="col-md-6">
                                <strong>Customer:</strong> {o.name}
                              </div>
                              <div className="col-md-6">
                                <strong>Mobile:</strong> {o.mobile}
                              </div>
                            </div>
                            
                            <div className="row mb-3">
                              <div className="col-md-6">
                                <strong>Placed:</strong> {formatDate(o.createdAt)} {new Date(o.createdAt).toLocaleTimeString()}
                              </div>
                              <div className="col-md-6">
                                <strong>Completed:</strong> {o.completedAt ? `${formatDate(o.completedAt)} ${new Date(o.completedAt).toLocaleTimeString()}` : '—'}
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <strong>Service Type:</strong> {o.serviceType}
                            </div>
                            
                            {o.address && (
                              <div className="mb-3">
                                <strong>Address:</strong> {renderAddress(o.address)}
                              </div>
                            )}
                            
                            <div className="card mb-3">
                              <div className="card-header">
                                <strong>Order Items</strong>
                              </div>
                              <ul className="list-group list-group-flush">
                                {o.items.map(i => (
                                  <li key={i.id} className="list-group-item d-flex justify-content-between">
                                    <span>{i.name} × {i.qty}</span>
                                    <span>₹{(i.price*i.qty).toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="row mb-3">
                              <div className="col-6">
                                <strong>Subtotal:</strong> ₹{o.items.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2)}
                              </div>
                              <div className="col-6">
                                <strong>CGST:</strong> ₹{(o.cgstAmount||0).toFixed(2)}
                              </div>
                              <div className="col-6">
                                <strong>SGST:</strong> ₹{(o.sgstAmount||0).toFixed(2)}
                              </div>
                              {o.serviceType==='Delivery' && (
                                <div className="col-6">
                                  <strong>Delivery Charge:</strong> ₹{(o.deliveryCharge||0).toFixed(2)}
                                </div>
                              )}
                              <div className="col-12 mt-2">
                                <h5>Total: ₹{o.total.toFixed(2)}</h5>
                              </div>
                            </div>
                            
                            {o.status==='Cancelled' && o.cancellationNote && (
                              <div className="alert alert-danger">
                                <strong>Cancellation Reason:</strong> {o.cancellationNote}
                              </div>
                            )}
                            
                            {o.rating != null && (
                              <div className="card mt-3">
                                <div className="card-header">Customer Feedback</div>
                                <div className="card-body">
                                  <div className="mb-2">
                                    <strong>Rating:</strong> {'★'.repeat(o.rating)}{'☆'.repeat(5-o.rating)}
                                  </div>
                                  {o.feedback && (
                                    <div>
                                      <strong>Comment:</strong>
                                      <p className="mb-0 mt-1">"{o.feedback}"</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>
          )}

          {/* Menu Management */}
          {activeTab === 'menu' && (
            <section className="settings-container">
              <h3 className="mb-4"><FaUtensils className="me-2" />Menu Management</h3>
              
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Add New Menu Item</h5>
                </div>
                <div className="card-body">
                  <form onSubmit={addMenu} className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Item Name</label>
                      <input name="name" placeholder="Enter item name" required className="form-control" />
                    </div>
                    
                    <div className="col-md-2">
                      <label className="form-label">Price (₹)</label>
                      <input name="price" type="number" step="0.01" placeholder="0.00" required className="form-control" />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Existing Category</label>
                      <select name="existingCategory" className="form-select">
                        <option value="">Select category</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Or New Category</label>
                      <input name="newCategory" placeholder="Create new category" className="form-control" />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Image</label>
                      <input name="image" type="file" className="form-control" />
                    </div>
                    
                    <div className="col-md-6 d-flex align-items-end">
                      <button type="submit" className="btn btn-primary ms-auto">
                        Add Item
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              
              {categories.map(cat => (
                <div key={cat} className="card mb-4">
                  <div className="card-header">
                    <h5 className="mb-0">{cat}</h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {menu.filter(i=>i.category===cat).map(item => (
                        <div key={item._id} className="col-md-3 mb-3">
                          <div className="card h-100 menu-item-card">
                            {item.image && (
                              <img
                                src={`http://localhost:3001${item.image}`}
                                className="card-img-top"
                                alt={item.name}
                              />
                            )}
                            <div className="card-body d-flex flex-column">
                              <h5 className="card-title">{item.name}</h5>
                              <p className="card-text text-primary fw-bold">₹{item.price.toFixed(2)}</p>
                              <button
                                className="btn btn-danger mt-auto"
                                onClick={() => delMenu(item._id)}
                              >
                                Remove Item
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {menu.filter(i=>i.category===cat).length===0 && (
                        <div className="col-12">
                          <p className="text-muted">No items in this category.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Feedback & Ratings */}
          {activeTab === 'feedback' && (
            <section className="settings-container">
              <h3 className="mb-4"><FaStar className="me-2" />Feedback & Ratings</h3>
              
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Rating Summary</h5>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-md-3">
                      <div className="card bg-light mb-3">
                        <div className="card-body">
                          <h6 className="card-subtitle mb-2 text-muted">Overall Rating</h6>
                          <h3 className="card-title text-warning">
                            {feedbackStats.overall.toFixed(1)}
                            <small className="text-muted"> / 5</small>
                          </h3>
                          <div className="text-warning">
                            {'★'.repeat(Math.round(feedbackStats.overall))}
                            {'☆'.repeat(5 - Math.round(feedbackStats.overall))}
                          </div>
                          <p className="card-text text-muted mt-2">Based on {feedbackStats.count} ratings</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-3">
                      <div className="card bg-light mb-3">
                        <div className="card-body">
                          <h6 className="card-subtitle mb-2 text-muted">Last 7 Days</h6>
                          <h3 className="card-title text-warning">
                            {feedbackStats.week.toFixed(1)}
                            <small className="text-muted"> / 5</small>
                          </h3>
                          <div className="text-warning">
                            {'★'.repeat(Math.round(feedbackStats.week))}
                            {'☆'.repeat(5 - Math.round(feedbackStats.week))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-3">
                      <div className="card bg-light mb-3">
                        <div className="card-body">
                          <h6 className="card-subtitle mb-2 text-muted">This Month</h6>
                          <h3 className="card-title text-warning">
                            {feedbackStats.month.toFixed(1)}
                            <small className="text-muted"> / 5</small>
                          </h3>
                          <div className="text-warning">
                            {'★'.repeat(Math.round(feedbackStats.month))}
                            {'☆'.repeat(5 - Math.round(feedbackStats.month))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-3">
                      <div className="card bg-light mb-3">
                        <div className="card-body">
                          <h6 className="card-subtitle mb-2 text-muted">This Year</h6>
                          <h3 className="card-title text-warning">
                            {feedbackStats.year.toFixed(1)}
                            <small className="text-muted"> / 5</small>
                          </h3>
                          <div className="text-warning">
                            {'★'.repeat(Math.round(feedbackStats.year))}
                            {'☆'.repeat(5 - Math.round(feedbackStats.year))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Customer Feedback</h5>
                </div>
                <div className="card-body p-0">
                  {orders.filter(o=>o.rating!=null).length === 0 ? (
                    <div className="p-4 text-center text-muted">
                      No customer feedback available yet.
                    </div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {orders.filter(o=>o.rating!=null)
                        .sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt))
                        .map(o=>(
                          <li key={o._id} className="list-group-item p-4">
                            <div className="d-flex justify-content-between mb-2">
                              <div>
                                <h6 className="mb-0">{o.name}</h6>
                                <small className="text-muted">{formatDate(o.completedAt)} {new Date(o.completedAt).toLocaleTimeString()}</small>
                              </div>
                              <div className="text-warning">
                                {'★'.repeat(o.rating)}{'☆'.repeat(5-o.rating)}
                              </div>
                            </div>
                            
                            {o.feedback && (
                              <p className="mb-2 mt-3 font-italic">"{o.feedback}"</p>
                            )}
                            
                            <div className="d-flex justify-content-between text-muted">
                              <small>Order #{o._id.slice(-6)}</small>
                              <small>{o.serviceType}</small>
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <section className="settings-container">
              <h3 className="mb-4"><FaCog className="me-2" />Settings</h3>
              
              <form onSubmit={saveSettings}>
                <div className="settings-section">
                  <h4>Service Availability</h4>
                  <div className="row g-3 mb-3">
                    {[
                      { id: 'dineIn', label: 'Dine-In' },
                      { id: 'takeaway', label: 'Takeaway' },
                      { id: 'delivery', label: 'Delivery' }
                    ].map(service => (
                      <div className="col-md-4" key={service.id}>
                        <div className="form-check form-switch">
                          <input
                            id={`${service.id}Toggle`}
                            type="checkbox"
                            className="form-check-input"
                            checked={safeSettings[`${service.id}Enabled`] || false}
                            onChange={e => updateSetting(`${service.id}Enabled`, e.target.checked)}
                          />
                          <label htmlFor={`${service.id}Toggle`} className="form-check-label">
                            Enable {service.label}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="form-check form-switch">
                        <input
                          id="cafeClosedToggle"
                          type="checkbox"
                          className="form-check-input"
                          checked={safeSettings.cafeClosed || false}
                          onChange={e => updateSetting('cafeClosed', e.target.checked)}
                        />
                        <label htmlFor="cafeClosedToggle" className="form-check-label">Cafe Closed</label>
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <div className="form-check form-switch">
                        <input
                          id="showNotesToggle"
                          type="checkbox"
                          className="form-check-input"
                          checked={safeSettings.showNotes || false}
                          onChange={e => updateSetting('showNotes', e.target.checked)}
                        />
                        <label htmlFor="showNotesToggle" className="form-check-label">Show Customer Notes</label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="settings-section">
                  <h4>Global Note</h4>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={safeSettings.note || ''}
                    onChange={e => updateSetting('note', e.target.value)}
                    placeholder="Enter note to display to customers (especially when cafe is closed)"
                  />
                </div>
                
                <div className="settings-section">
                  <h4>Tax & Delivery Settings</h4>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">CGST (%)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="form-control"
                        value={safeSettings.cgstPercent || 0}
                        onChange={e => updateSetting('cgstPercent', +e.target.value)}
                      />
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label">SGST (%)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="form-control"
                        value={safeSettings.sgstPercent || 0}
                        onChange={e => updateSetting('sgstPercent', +e.target.value)}
                      />
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label">Delivery Charge (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="form-control"
                        value={safeSettings.deliveryCharge || 0}
                        onChange={e => updateSetting('deliveryCharge', +e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="d-flex justify-content-end mt-4">
                  <button type="submit" className="btn btn-primary btn-lg">
                    <FaSave className="me-2" /> Save All Settings
                  </button>
                </div>
                
                {savingSuccess && (
                  <div className="alert alert-success mt-3 fade-in-up">
                    <strong>Success!</strong> Your settings have been saved.
                  </div>
                )}
              </form>
            </section>
          )}

        </div>
      </div>
    </>
  );
}