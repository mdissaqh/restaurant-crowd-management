import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaShoppingCart, FaMapMarkerAlt } from 'react-icons/fa';

export default function CartPage() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '{}'));
  const [serviceType, setServiceType] = useState('Dine-in');
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
  const [address, setAddress] = useState({
    flat: '', area: '', landmark: '',
    city: '', pincode: '', mobile: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [socket, setSocket] = useState(null);
  const [updateNotification, setUpdateNotification] = useState('');

  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  // Fetch menu data
  const fetchMenu = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/menu');
      setMenu(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching menu:', error);
      return [];
    }
  };

  // Fetch settings data
  const fetchSettings = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/settings');
      setSettings(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return settings;
    }
  };

  // Show update notification
  const showUpdateNotification = (message) => {
    setUpdateNotification(message);
    setTimeout(() => {
      setUpdateNotification('');
    }, 4000);
  };

  // Clean up cart when menu items are removed
  const cleanupCart = (currentMenu) => {
    const currentCart = JSON.parse(localStorage.getItem('cart') || '{}');
    const menuItemIds = new Set(currentMenu.map(item => item._id));
    const cleanedCart = {};
    let itemsRemoved = 0;

    Object.entries(currentCart).forEach(([itemId, quantity]) => {
      if (menuItemIds.has(itemId)) {
        cleanedCart[itemId] = quantity;
      } else {
        itemsRemoved++;
      }
    });

    if (itemsRemoved > 0) {
      setCart(cleanedCart);
      localStorage.setItem('cart', JSON.stringify(cleanedCart));
      showUpdateNotification(`${itemsRemoved} unavailable item(s) removed from cart`);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMenu(), fetchSettings()])
      .then(([menuData, settingsData]) => {
        // Clean up cart with fresh menu data
        cleanupCart(menuData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
    
    // Initialize socket connection
    const sock = io('http://localhost:3001');
    setSocket(sock);
    
    // Listen for real-time updates
    sock.on('menuUpdated', () => {
      console.log('Menu updated - refreshing menu data and cleaning cart');
      fetchMenu().then(menuData => {
        cleanupCart(menuData);
        showUpdateNotification('Menu has been updated!');
      });
    });
    
    sock.on('settingsUpdated', () => {
      console.log('Settings updated - refreshing settings data');
      fetchSettings().then(() => {
        showUpdateNotification('Store settings have been updated!');
      });
    });
    
    // Clean up socket connection
    return () => {
      if (sock) {
        sock.disconnect();
      }
    };
  }, []);

  const saveCart = newCart => {
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };
  
  const inc = id => saveCart({ ...cart, [id]: (cart[id]||0) + 1 });
  
  const dec = id => {
    const next = Math.max((cart[id]||0) - 1, 0);
    const nc = { ...cart, [id]: next };
    if (next === 0) delete nc[id];
    saveCart(nc);
  };
  
  const removeItem = id => {
    const nc = { ...cart };
    delete nc[id];
    saveCart(nc);
  };

  const entries = Object.entries(cart).filter(([, qty]) => qty > 0);
  const validEntries = entries.filter(([id]) => menu.some(m => m._id === id));
  const invalidEntries = entries.filter(([id]) => !menu.some(m => m._id === id));

  const items = validEntries.map(([id, qty]) => {
    const m = menu.find(x => x._id === id);
    return { ...m, qty };
  });

  const baseTotal = items.reduce((sum, i) => sum + (i.price||0) * i.qty, 0);
  const cgstAmt = +(baseTotal * settings.cgstPercent/100).toFixed(2);
  const sgstAmt = +(baseTotal * settings.sgstPercent/100).toFixed(2);
  const deliveryFee = serviceType==='Delivery' ? settings.deliveryCharge : 0;
  const grandTotal = baseTotal + cgstAmt + sgstAmt + deliveryFee;

  const canCheckout =
    !settings.cafeClosed &&
    ((serviceType==='Dine-in' && settings.dineInEnabled) ||
     (serviceType==='Takeaway'&& settings.takeawayEnabled) ||
     (serviceType==='Delivery'&& settings.deliveryEnabled)
    );

  const submitOrder = async e => {
    e.preventDefault();
    if (!items.length) {
      alert('Cart is empty or only contains unavailable items.');
      return;
    }

    if (serviceType==='Delivery') {
      for (let f of ['flat','area','landmark','city','pincode','mobile']) {
        if (!address[f].trim()) {
          alert(`Please fill in ${f}`);
          return;
        }
      }
    }
    
    if (!canCheckout) {
      alert(settings.note||'Service unavailable');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: user.name,
      mobile: user.mobile,
      email: '',
      serviceType,
      address: serviceType==='Delivery' ? address : {},
      items: items.map(i => ({ id: i._id, qty: i.qty }))
    };

    try {
      await axios.post('http://localhost:3001/api/order', payload);
      localStorage.removeItem('cart');
      alert(`Order placed! Total: ₹${grandTotal.toFixed(2)}`);
      navigate('/my-orders');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Real-time Update Notification */}
      {updateNotification && (
        <div className="alert alert-success alert-dismissible fade show position-fixed"
             style={{ top: '20px', right: '20px', zIndex: 1050, minWidth: '300px' }}>
          <strong>Update!</strong> {updateNotification}
        </div>
      )}

      <div className="container py-5">
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="mb-0">
                <FaShoppingCart className="me-2" /> Your Cart
              </h2>
              <button 
                className="btn btn-outline-primary"
                onClick={() => navigate('/shop')}
              >
                <FaArrowLeft className="me-2" /> Back to Menu
              </button>
            </div>

            {invalidEntries.length > 0 && (
              <div className="alert alert-warning mb-4">
                <h5>Unavailable Items</h5>
                <p className="mb-2">The following items were removed by the admin and are no longer available:</p>
                {invalidEntries.map(([id]) => (
                  <div
                    key={id}
                    className="d-flex justify-content-between align-items-center p-2 border-bottom"
                  >
                    <span>This item was removed by admin</span>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeItem(id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {items.length === 0 ? (
              <div className="alert alert-info">
                <p className="mb-0">Your cart is empty. Add some items from our menu.</p>
              </div>
            ) : (
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Order Items</h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Item</th>
                          <th style={{ width: "140px" }}>Quantity</th>
                          <th style={{ width: "140px" }} className="text-end">Price</th>
                          <th style={{ width: "50px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(i => (
                          <tr key={i._id}>
                            <td className="align-middle">{i.name}</td>
                            <td>
                              <div className="d-flex align-items-center quantity-controls">
                                <button
                                  className="btn btn-sm btn-outline-secondary quantity-btn"
                                  onClick={() => dec(i._id)}
                                >–</button>
                                <span className="quantity-display mx-2">{i.qty}</span>
                                <button
                                  className="btn btn-sm btn-outline-secondary quantity-btn"
                                  onClick={() => inc(i._id)}
                                >+</button>
                              </div>
                            </td>
                            <td className="text-end align-middle">₹{(i.price * i.qty).toFixed(2)}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeItem(i._id)}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {items.length > 0 && (
              <>
                <div className="row">
                  <div className="col-md-6 mb-4">
                    <div className="card h-100">
                      <div className="card-header">
                        <h5 className="mb-0">Service Type</h5>
                      </div>
                      <div className="card-body">
                        <select
                          className="form-select mb-3"
                          value={serviceType}
                          onChange={e => setServiceType(e.target.value)}
                          disabled={settings.cafeClosed}
                        >
                          <option value="Dine-in" disabled={!settings.dineInEnabled}>Dine-in</option>
                          <option value="Takeaway" disabled={!settings.takeawayEnabled}>Takeaway</option>
                          <option value="Delivery" disabled={!settings.deliveryEnabled}>Delivery</option>
                        </select>

                        {settings.showNotes && (
                          <div className="alert alert-info mb-0">
                            {settings.cafeClosed
                              ? settings.note || 'Cafe is closed'
                              : settings.note}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6 mb-4">
                    <div className="card h-100">
                      <div className="card-header">
                        <h5 className="mb-0">Order Summary</h5>
                      </div>
                      <div className="card-body">
                        <div className="d-flex justify-content-between mb-2">
                          <span>Subtotal:</span>
                          <span>₹{baseTotal.toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span>CGST ({settings.cgstPercent}%):</span>
                          <span>₹{cgstAmt.toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span>SGST ({settings.sgstPercent}%):</span>
                          <span>₹{sgstAmt.toFixed(2)}</span>
                        </div>
                        {serviceType==='Delivery' && (
                          <div className="d-flex justify-content-between mb-2">
                            <span>Delivery Charge:</span>
                            <span>₹{deliveryFee.toFixed(2)}</span>
                          </div>
                        )}
                        <hr />
                        <div className="d-flex justify-content-between fw-bold">
                          <span>Total:</span>
                          <span className="text-primary fs-5">₹{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {serviceType === 'Delivery' && (
                  <div className="card mb-4">
                    <div className="card-header d-flex align-items-center">
                      <FaMapMarkerAlt className="me-2" />
                      <h5 className="mb-0">Delivery Address</h5>
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Flat / House no. / Bldg</label>
                          <input
                            className="form-control"
                            required
                            value={address.flat}
                            onChange={e=>setAddress(a=>({...a,flat:e.target.value}))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Area / Street / Sector / Village</label>
                          <input
                            className="form-control"
                            required
                            value={address.area}
                            onChange={e=>setAddress(a=>({...a,area:e.target.value}))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Landmark</label>
                          <input
                            className="form-control"
                            required
                            value={address.landmark}
                            onChange={e=>setAddress(a=>({...a,landmark:e.target.value}))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Town / City</label>
                          <input
                            className="form-control"
                            required
                            value={address.city}
                            onChange={e=>setAddress(a=>({...a,city:e.target.value}))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Pincode</label>
                          <input
                            type="text"
                            className="form-control"
                            required
                            value={address.pincode}
                            onChange={e=>setAddress(a=>({...a,pincode:e.target.value}))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Mobile number</label>
                          <input
                            type="tel"
                            className="form-control"
                            required
                            value={address.mobile}
                            onChange={e=>setAddress(a=>({...a,mobile:e.target.value}))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="d-grid">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={submitOrder}
                    disabled={!items.length || !canCheckout || submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      'Place Order'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
