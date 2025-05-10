import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

export default function CartPage() {
  const [menu, setMenu]                 = useState([]);
  const [cart, setCart]                 = useState(() => JSON.parse(localStorage.getItem('cart') || '{}'));
  const [serviceType, setServiceType]   = useState('Dine-in');
  const [settings, setSettings]         = useState({
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

  // NEW structured address state
  const [address, setAddress] = useState({
    flat: '', area: '', landmark: '',
    city: '', pincode: '', mobile: ''
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

  const baseTotal = items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);
  const cgstAmt     = +(baseTotal * settings.cgstPercent/100).toFixed(2);
  const sgstAmt     = +(baseTotal * settings.sgstPercent/100).toFixed(2);
  const deliveryFee = serviceType==='Delivery' ? settings.deliveryCharge : 0;
  const grandTotal  = baseTotal + cgstAmt + sgstAmt + deliveryFee;

  const canCheckout =
    !settings.cafeClosed &&
    ((serviceType === 'Dine-in' && settings.dineInEnabled) ||
     (serviceType === 'Takeaway' && settings.takeawayEnabled) ||
     (serviceType === 'Delivery' && settings.deliveryEnabled));

  const submitOrder = async e => {
    e.preventDefault();
    if (!items.length) return alert('Cart is empty');

    if (serviceType === 'Delivery') {
      // validate structured address
      for (let f of ['flat','area','landmark','city','pincode','mobile']) {
        if (!address[f].trim()) {
          return alert(`Please fill in ${f}`);
        }
      }
    }

    if (!canCheckout) return alert(settings.note || 'Service unavailable');

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

      <hr />

      <div className="mb-2">Subtotal: ₹{baseTotal.toFixed(2)}</div>
      <div className="mb-2">CGST ({settings.cgstPercent}%): ₹{cgstAmt.toFixed(2)}</div>
      <div className="mb-2">SGST ({settings.sgstPercent}%): ₹{sgstAmt.toFixed(2)}</div>
      {serviceType==='Delivery' && (
        <div className="mb-2">Delivery Charge: ₹{deliveryFee.toFixed(2)}</div>
      )}
      <h5>Total: ₹{grandTotal.toFixed(2)}</h5>

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
          <label>Flat / House no. / Bldg:</label>
          <input className="form-control mb-2" required
            value={address.flat}
            onChange={e=>setAddress(a=>({...a,flat:e.target.value}))}
          />
          <label>Area / Street / Sector / Village:</label>
          <input className="form-control mb-2" required
            value={address.area}
            onChange={e=>setAddress(a=>({...a,area:e.target.value}))}
          />
          <label>Landmark:</label>
          <input className="form-control mb-2" required
            value={address.landmark}
            onChange={e=>setAddress(a=>({...a,landmark:e.target.value}))}
          />
          <label>Town / City:</label>
          <input className="form-control mb-2" required
            value={address.city}
            onChange={e=>setAddress(a=>({...a,city:e.target.value}))}
          />
          <label>Pincode:</label>
          <input type="text" className="form-control mb-2" required
            value={address.pincode}
            onChange={e=>setAddress(a=>({...a,pincode:e.target.value}))}
          />
          <label>Mobile number:</label>
          <input type="tel" className="form-control" required
            value={address.mobile}
            onChange={e=>setAddress(a=>({...a,mobile:e.target.value}))}
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
