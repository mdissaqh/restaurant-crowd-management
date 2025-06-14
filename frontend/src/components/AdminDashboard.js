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
  FaSave,
  FaShoppingCart,
  FaSearch,
  FaTimes,
  FaEdit,
  FaCheck
} from 'react-icons/fa';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('earnings');
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [earningStats, setEarningStats] = useState({
    today: 0, week: 0, month: 0, year: 0,
    todayOrders: 0, weekOrders: 0, monthOrders: 0, yearOrders: 0
  });
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeTotal, setRangeTotal] = useState(0);
  const [rangeOrders, setRangeOrders] = useState(0);
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
  const [socket, setSocket] = useState(null);
 
  // Search functionality state
  const [activeOrdersSearch, setActiveOrdersSearch] = useState('');
  const [completedOrdersSearch, setCompletedOrdersSearch] = useState('');

  // NEW: Price editing state
  const [editingPrices, setEditingPrices] = useState({});
  const [editPriceValues, setEditPriceValues] = useState({});

  const todayStr = new Date().toISOString().slice(0, 10);

  // Helper function to format date to Indian format (DD/MM/YYYY)
  const formatToIndianDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    fetchMenu();
    fetchOrders();
    fetchSettings();
   
    const sock = io('http://localhost:3001');
    setSocket(sock);
   
    sock.on('newOrder', fetchOrders);
    sock.on('orderUpdated', fetchOrders);
    sock.on('settingsUpdated', (updatedSettings) => {
      console.log('Settings updated via socket:', updatedSettings);
      setSettings(prevSettings => ({
        ...prevSettings,
        ...updatedSettings
      }));
    });
   
    return () => {
      sock.disconnect();
    };
  }, []);

  // Auto-calculate range total when dates or orders change
  useEffect(() => {
    calcRange(orders);
  }, [rangeStart, rangeEnd, orders]);

  // --- Fetchers ---
  function fetchSettings() {
    axios.get('http://localhost:3001/api/settings')
      .then(r => {
        console.log('Fetched settings:', r.data);
        const fetchedSettings = r.data || {};
        setSettings(prevSettings => ({
          ...prevSettings,
          ...fetchedSettings
        }));
      })
      .catch(console.error);
  }

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
   
    // Today calculation - current day from 00:00:00 to 23:59:59
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayCompleted = completed.filter(o => {
      const d = new Date(o.completedAt);
      return d >= startToday && d <= endToday;
    });
    const todaySum = todayCompleted.reduce((s, o) => s + o.total, 0);
    const todayOrderCount = todayCompleted.length;
   
    // Week calculation (Sunday to Saturday) - Fixed for proper Sunday-Saturday week
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - currentDay); // Go back to Sunday
    weekStart.setHours(0, 0, 0, 0);
   
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Add 6 days to get Saturday
    weekEnd.setHours(23, 59, 59, 999);
   
    const weekCompleted = completed.filter(o => {
      const d = new Date(o.completedAt);
      return d >= weekStart && d <= weekEnd;
    });
    const weekSum = weekCompleted.reduce((s, o) => s + o.total, 0);
    const weekOrderCount = weekCompleted.length;
   
    // Current Month calculation - from 1st day to last day of current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthCompleted = completed.filter(o => {
      const d = new Date(o.completedAt);
      return d >= monthStart && d <= monthEnd;
    });
    const monthSum = monthCompleted.reduce((s, o) => s + o.total, 0);
    const monthOrderCount = monthCompleted.length;
   
    // Current Year calculation - from Jan 1st to Dec 31st of current year
    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    const yearCompleted = completed.filter(o => {
      const d = new Date(o.completedAt);
      return d >= yearStart && d <= yearEnd;
    });
    const yearSum = yearCompleted.reduce((s, o) => s + o.total, 0);
    const yearOrderCount = yearCompleted.length;

    setEarningStats({
      today: todaySum,
      week: weekSum,
      month: monthSum,
      year: yearSum,
      todayOrders: todayOrderCount,
      weekOrders: weekOrderCount,
      monthOrders: monthOrderCount,
      yearOrders: yearOrderCount
    });
  }

  function calcRange(list) {
    if (!rangeStart || !rangeEnd) {
      setRangeTotal(0);
      setRangeOrders(0);
      return;
    }
    const s = new Date(rangeStart); s.setHours(0, 0, 0, 0);
    const e = new Date(rangeEnd); e.setHours(23, 59, 59, 999);
    const rangeCompleted = list
      .filter(o => ['Completed', 'Delivered'].includes(o.status))
      .filter(o => {
        const d = new Date(o.completedAt);
        return d >= s && d <= e;
      });
    const sum = rangeCompleted.reduce((s, o) => s + o.total, 0);
    setRangeTotal(sum);
    setRangeOrders(rangeCompleted.length);
  }

  // Fixed feedback statistics calculation with corrected "Last 7 Days" logic
  function calcFeedbackStats(list) {
    const now = new Date();
   
    // Fixed: Last 7 Days - proper rolling 7-day window
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
   
    // Current Month calculation for ratings
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
   
    // Current Year calculation for ratings
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    // Filter orders that have ratings
    const rated = list.filter(o => o.rating != null && o.completedAt);
   
    // Helper function to calculate average rating
    const avg = arr => arr.length
      ? arr.reduce((s, o) => s + o.rating, 0) / arr.length
      : 0;

    // Calculate Last 7 Days ratings with improved filtering
    const last7DaysRated = rated.filter(o => {
      const completedDate = new Date(o.completedAt);
      return completedDate >= sevenDaysAgo && completedDate <= now;
    });

    // Calculate Current Month ratings
    const monthRated = rated.filter(o => {
      const completedDate = new Date(o.completedAt);
      return completedDate >= monthStart && completedDate <= monthEnd;
    });

    // Calculate Current Year ratings
    const yearRated = rated.filter(o => {
      const completedDate = new Date(o.completedAt);
      return completedDate >= yearStart && completedDate <= yearEnd;
    });

    setFeedbackStats({
      overall: avg(rated),
      week: avg(last7DaysRated),
      month: avg(monthRated),
      year: avg(yearRated),
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
        if (socket) {
          socket.emit('menuUpdated');
        }
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
        if (socket) {
          socket.emit('menuUpdated');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  // NEW: Price editing functions
  function startEditPrice(itemId, currentPrice) {
    setEditingPrices(prev => ({ ...prev, [itemId]: true }));
    setEditPriceValues(prev => ({ ...prev, [itemId]: currentPrice.toString() }));
  }

  function cancelEditPrice(itemId) {
    setEditingPrices(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
    setEditPriceValues(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  }

  function savePrice(itemId) {
    const newPrice = parseFloat(editPriceValues[itemId]);
    
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('Please enter a valid price greater than 0');
      return;
    }

    setLoading(true);
    axios.put(`http://localhost:3001/api/menu/${itemId}`, { price: newPrice })
      .then(() => {
        fetchMenu();
        cancelEditPrice(itemId);
        if (socket) {
          socket.emit('menuUpdated');
        }
      })
      .catch(error => {
        console.error('Error updating price:', error);
        alert('Failed to update price. Please try again.');
      })
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

  // Updated function to immediately save settings when toggles are changed
  function updateSettingImmediate(key, value) {
    console.log(`Updating setting ${key} to ${value}`);
   
    // Update local state immediately for responsive UI
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
   
    // Save to server immediately
    axios.post('http://localhost:3001/api/settings', updatedSettings)
      .then(r => {
        console.log('Settings saved successfully:', r.data);
        setSettings(r.data);
       
        // Notify clients via socket
        if (socket) {
          socket.emit('settingsUpdated');
        }
      })
      .catch(error => {
        console.error('Failed to save settings:', error);
        // Revert local state on error
        fetchSettings();
        alert('Failed to save settings. Please try again.');
      });
  }

  // Updated function for form input changes (not toggles)
  function updateSetting(key, value) {
    const updatedSettings = { ...settings, [key]: value };
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
       
        if (socket) {
          socket.emit('settingsUpdated');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  // Helper function to get the next status for display
  function getNextStatus(order) {
    const flow = order.serviceType !== 'Delivery'
      ? ['Pending', 'In Progress', 'Ready', 'Completed']
      : ['Pending', 'In Progress', 'Ready for Pickup', 'Out for Delivery', 'Delivered'];
    const currentIndex = flow.indexOf(order.status);
    if (currentIndex < 0 || currentIndex === flow.length - 1) return null;
    return flow[currentIndex + 1];
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

  // Helper functions for search functionality
  const filterOrdersBySearch = (ordersList, searchTerm) => {
    if (!searchTerm.trim()) return ordersList;
    return ordersList.filter(order =>
      order._id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Ensure settings is always a valid object - this prevents the undefined error
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

          {/* Enhanced Earnings Dashboard */}
          {activeTab === 'earnings' && (
            <section className="settings-container">
              <h3 className="mb-4"><FaChartBar className="me-2" />Earnings Dashboard</h3>
             
              {/* Earnings Section */}
              <div className="mb-5">
                <h4 className="mb-3 text-primary">💰 Revenue Statistics</h4>
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h5 className="card-title">Today</h5>
                        <h2 className="card-text text-primary">₹{earningStats.today.toFixed(2)}</h2>
                        <small className="text-muted">{earningStats.todayOrders} orders</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h5 className="card-title">This Week</h5>
                        <h2 className="card-text text-primary">₹{earningStats.week.toFixed(2)}</h2>
                        <small className="text-muted">{earningStats.weekOrders} orders</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h5 className="card-title">This Month</h5>
                        <h2 className="card-text text-primary">₹{earningStats.month.toFixed(2)}</h2>
                        <small className="text-muted">{earningStats.monthOrders} orders</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h5 className="card-title">This Year</h5>
                        <h2 className="card-text text-primary">₹{earningStats.year.toFixed(2)}</h2>
                        <small className="text-muted">{earningStats.yearOrders} orders</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Count Section */}
              <div className="mb-5">
                <h4 className="mb-3 text-success">📊 Order Statistics</h4>
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card bg-light border-success">
                      <div className="card-body text-center">
                        <FaShoppingCart className="text-success mb-2" style={{ fontSize: '2rem' }} />
                        <h5 className="card-title">Today</h5>
                        <h2 className="card-text text-success">{earningStats.todayOrders}</h2>
                        <small className="text-muted">orders completed</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-light border-success">
                      <div className="card-body text-center">
                        <FaShoppingCart className="text-success mb-2" style={{ fontSize: '2rem' }} />
                        <h5 className="card-title">This Week</h5>
                        <h2 className="card-text text-success">{earningStats.weekOrders}</h2>
                        <small className="text-muted">orders completed</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-light border-success">
                      <div className="card-body text-center">
                        <FaShoppingCart className="text-success mb-2" style={{ fontSize: '2rem' }} />
                        <h5 className="card-title">This Month</h5>
                        <h2 className="card-text text-success">{earningStats.monthOrders}</h2>
                        <small className="text-muted">orders completed</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-light border-success">
                      <div className="card-body text-center">
                        <FaShoppingCart className="text-success mb-2" style={{ fontSize: '2rem' }} />
                        <h5 className="card-title">This Year</h5>
                        <h2 className="card-text text-success">{earningStats.yearOrders}</h2>
                        <small className="text-muted">orders completed</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Custom Date Range with Indian Date Format */}
              <div className="card p-4 mb-4">
                <h5 className="mb-3">📅 Custom Date Range Analysis</h5>
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
                      Refresh Calculation
                    </button>
                  </div>
                </div>
               
                {rangeStart && rangeEnd && (
                  <div className="mt-4">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="alert alert-success">
                          <h6 className="mb-1">💰 Total Revenue</h6>
                          <h5 className="mb-0">₹{rangeTotal.toFixed(2)}</h5>
                          <small>from {formatToIndianDate(rangeStart)} to {formatToIndianDate(rangeEnd)}</small>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="alert alert-info">
                          <h6 className="mb-1">📊 Total Orders</h6>
                          <h5 className="mb-0">{rangeOrders}</h5>
                          <small>completed orders</small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Active Orders with Search */}
          {activeTab === 'active' && (
            <section className="settings-container">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="mb-0"><FaTasks className="me-2" />Active Orders</h3>
                <div className="d-flex align-items-center">
                  <div className="input-group" style={{ width: '300px' }}>
                    <span className="input-group-text">
                      <FaSearch />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by Order ID..."
                      value={activeOrdersSearch}
                      onChange={e => setActiveOrdersSearch(e.target.value)}
                    />
                    {activeOrdersSearch && (
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => setActiveOrdersSearch('')}
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {(() => {
                const activeOrders = orders.filter(o => !['Completed','Delivered','Cancelled'].includes(o.status));
                const filteredActiveOrders = filterOrdersBySearch(activeOrders, activeOrdersSearch);
               
                if (!activeOrders.length) {
                  return <div className="alert alert-info">No active orders at the moment.</div>;
                }
               
                if (activeOrdersSearch && !filteredActiveOrders.length) {
                  return (
                    <div className="alert alert-warning">
                      No active orders found matching "{activeOrdersSearch}". <button className="btn btn-link p-0" onClick={() => setActiveOrdersSearch('')}>Clear search</button>
                    </div>
                  );
                }

                return (
                  <>
                    {activeOrdersSearch && (
                      <div className="alert alert-info mb-3">
                        Showing {filteredActiveOrders.length} of {activeOrders.length} active orders matching "{activeOrdersSearch}"
                      </div>
                    )}
                    <div className="row">
                      {filteredActiveOrders.map(o => {
                        const subtotal = o.items.reduce((sum, i) => sum + i.price * i.qty, 0);
                        const nextStatus = getNextStatus(o);
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
                                {nextStatus ? (
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => updateStatus(o)}
                                  >
                                    Move to {nextStatus}
                                  </button>
                                ) : (
                                  <span className="text-muted">Order Complete</span>
                                )}
                                <button className="btn btn-danger" onClick={() => cancelOrder(o)}>Cancel</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </section>
          )}

          {/* Completed & Cancelled Orders with Search */}
          {activeTab === 'completed' && (
            <section className="settings-container">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="mb-0"><FaCheckCircle className="me-2" />Completed & Cancelled Orders</h3>
                <div className="d-flex align-items-center">
                  <div className="input-group" style={{ width: '300px' }}>
                    <span className="input-group-text">
                      <FaSearch />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by Order ID..."
                      value={completedOrdersSearch}
                      onChange={e => setCompletedOrdersSearch(e.target.value)}
                    />
                    {completedOrdersSearch && (
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => setCompletedOrdersSearch('')}
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {(() => {
                const completedOrders = orders.filter(o => ['Completed','Delivered','Cancelled'].includes(o.status));
                const filteredCompletedOrders = filterOrdersBySearch(completedOrders, completedOrdersSearch);
               
                if (!completedOrders.length) {
                  return <div className="alert alert-info">No completed or cancelled orders yet.</div>;
                }
               
                if (completedOrdersSearch && !filteredCompletedOrders.length) {
                  return (
                    <div className="alert alert-warning">
                      No completed/cancelled orders found matching "{completedOrdersSearch}". <button className="btn btn-link p-0" onClick={() => setCompletedOrdersSearch('')}>Clear search</button>
                    </div>
                  );
                }
               
                return (
                  <>
                    {completedOrdersSearch && (
                      <div className="alert alert-info mb-3">
                        Showing {filteredCompletedOrders.length} of {completedOrders.length} completed/cancelled orders matching "{completedOrdersSearch}"
                      </div>
                    )}
                    <div className="row">
                      {filteredCompletedOrders.map(o => (
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
                  </>
                );
              })()}
            </section>
          )}

          {/* Enhanced Menu Management with Price Editing */}
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
                          <div className="card h-100" style={{ minHeight: '400px' }}>
                            {item.image && (
                              <div className="position-relative" style={{
                                minHeight: '200px',
                                maxHeight: '250px',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#f8f9fa'
                              }}>
                                <img
                                  src={`http://localhost:3001${item.image}`}
                                  className="img-fluid"
                                  alt={item.name}
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: '250px',
                                    objectFit: 'contain',
                                    objectPosition: 'center'
                                  }}
                                />
                              </div>
                            )}
                            <div className="card-body d-flex flex-column">
                              <h5 className="card-title">{item.name}</h5>
                              
                              {/* Price editing section */}
                              <div className="mb-3">
                                {editingPrices[item._id] ? (
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-muted">₹</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="form-control form-control-sm"
                                      value={editPriceValues[item._id] || ''}
                                      onChange={e => setEditPriceValues(prev => ({
                                        ...prev,
                                        [item._id]: e.target.value
                                      }))}
                                      style={{ width: '80px' }}
                                    />
                                    <button
                                      className="btn btn-success btn-sm"
                                      onClick={() => savePrice(item._id)}
                                      disabled={loading}
                                    >
                                      <FaCheck />
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => cancelEditPrice(item._id)}
                                    >
                                      <FaTimes />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="d-flex align-items-center justify-content-between">
                                    <span className="text-primary fw-bold">₹{item.price.toFixed(2)}</span>
                                    <button
                                      className="btn btn-outline-primary btn-sm"
                                      onClick={() => startEditPrice(item._id, item.price)}
                                      disabled={loading}
                                    >
                                      <FaEdit />
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button
                                className="btn btn-danger mt-auto"
                                onClick={() => delMenu(item._id)}
                                disabled={loading}
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
                    <div className="col-md-4">
                      <div className="form-check form-switch">
                        <input
                          id="dineInEnabledToggle"
                          type="checkbox"
                          className="form-check-input"
                          checked={safeSettings.dineInEnabled || false}
                          onChange={e => updateSettingImmediate('dineInEnabled', e.target.checked)}
                        />
                        <label htmlFor="dineInEnabledToggle" className="form-check-label">
                          Enable Dine-In
                        </label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-check form-switch">
                        <input
                          id="takeawayEnabledToggle"
                          type="checkbox"
                          className="form-check-input"
                          checked={safeSettings.takeawayEnabled || false}
                          onChange={e => updateSettingImmediate('takeawayEnabled', e.target.checked)}
                        />
                        <label htmlFor="takeawayEnabledToggle" className="form-check-label">
                          Enable Takeaway
                        </label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-check form-switch">
                        <input
                          id="deliveryEnabledToggle"
                          type="checkbox"
                          className="form-check-input"
                          checked={safeSettings.deliveryEnabled || false}
                          onChange={e => updateSettingImmediate('deliveryEnabled', e.target.checked)}
                        />
                        <label htmlFor="deliveryEnabledToggle" className="form-check-label">
                          Enable Delivery
                        </label>
                      </div>
                    </div>
                  </div>
                 
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="form-check form-switch">
                        <input
                          id="cafeClosedToggle"
                          type="checkbox"
                          className="form-check-input"
                          checked={safeSettings.cafeClosed || false}
                          onChange={e => updateSettingImmediate('cafeClosed', e.target.checked)}
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
                          onChange={e => updateSettingImmediate('showNotes', e.target.checked)}
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
                  {safeSettings.note && (
                    <div className="mt-3 alert alert-info">
                      <strong>Current Note Preview:</strong>
                      <p className="mb-0 mt-2">"{safeSettings.note}"</p>
                    </div>
                  )}
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
                    <FaSave className="me-2" /> Save Tax & Delivery Settings
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
