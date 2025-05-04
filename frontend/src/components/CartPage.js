import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function CartPage() {
  const [menu, setMenu]           = useState([]);
  const [cart, setCart]           = useState(() => JSON.parse(localStorage.getItem('cart')||'{}'));
  const [serviceType, setServiceType] = useState('Dine-in');
  const [address, setAddress]     = useState('');
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:3001/api/menu').then(r => setMenu(r.data));
  }, []);

  const items = Object.entries(cart)
    .filter(([,q]) => q>0)
    .map(([id,q]) => {
      const m = menu.find(x=>x._id===id) || {};
      return { ...m, qty: q };
    });
  const total = items.reduce((s,i)=>s + (i.price||0)*i.qty, 0);

  const submitOrder = async e => {
    e.preventDefault();
    if (!items.length) return alert('Cart is empty');
    const payload = {
      name: user.name,
      mobile: user.mobile,
      email: '',
      serviceType,
      address: serviceType==='Delivery' ? address : '',
      items: items.map(i=>({ id:i._id, qty:i.qty }))
    };
    await axios.post('http://localhost:3001/api/order', payload);
    localStorage.removeItem('cart');
    alert('Order placed!');
    navigate('/my-orders');
  };

  return (
    <div className="container py-4">
      <h2>Your Cart</h2>

      {items.map(i=>(
        <div key={i._id} className="d-flex justify-content-between mb-2">
          <span>{i.name} × {i.qty}</span>
          <span>₹{(i.price*i.qty).toFixed(2)}</span>
        </div>
      ))}

      <div className="d-flex justify-content-between fw-bold mb-3">
        <span>Total:</span><span>₹{total.toFixed(2)}</span>
      </div>

      <div className="mb-3">
        <label>Service:</label>
        <select className="form-select" value={serviceType} onChange={e=>setServiceType(e.target.value)}>
          <option>Dine-in</option>
          <option>Takeaway</option>
          <option>Delivery</option>
        </select>
      </div>

      {serviceType==='Delivery' && (
        <div className="mb-3">
          <label>Delivery Address</label>
          <textarea
            className="form-control"
            required
            value={address}
            onChange={e=>setAddress(e.target.value)}
          />
        </div>
      )}

      <button className="btn btn-success" onClick={submitOrder} disabled={!items.length}>
        Checkout
      </button>
    </div>
  );
}
