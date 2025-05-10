// frontend/src/components/CustomerShop.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import Cart from './Cart';

export default function CustomerShop() {
  const [menu, setMenu]               = useState([]);
  const [categories, setCategories]   = useState([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [searchTerm, setSearchTerm]   = useState('');
  const [cart, setCart]               = useState(() => JSON.parse(localStorage.getItem('cart') || '{}'));
  const [settings, setSettings]       = useState({
    dineInEnabled:  true,
    takeawayEnabled:true,
    deliveryEnabled:true,
    cafeClosed:     false,
    showNotes:      false,
    note:           ''
  });

  const user     = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:3001/api/menu')
      .then(r => {
        setMenu(r.data);
        setCategories([...new Set(r.data.map(i => i.category))]);
      });
    axios.get('http://localhost:3001/api/settings')
      .then(r => setSettings(r.data));
    const sock = io('http://localhost:3001');
    sock.on('settingsUpdated', s => setSettings(s));
    return () => sock.disconnect();
  }, []);

  const inc = id => {
    const u = { ...cart, [id]: (cart[id] || 0) + 1 };
    setCart(u);
    localStorage.setItem('cart', JSON.stringify(u));
  };
  const dec = id => {
    const next = Math.max((cart[id] || 0) - 1, 0);
    const u = { ...cart, [id]: next };
    if (next === 0) delete u[id];
    setCart(u);
    localStorage.setItem('cart', JSON.stringify(u));
  };

  const logout     = () => { localStorage.removeItem('user'); navigate('/login'); };
  const goToCart   = () => navigate('/cart');
  const goToOrders = () => navigate('/my-orders');

  const filteredMenu = menu.filter(item =>
    (selectedCat === 'All' || item.category === selectedCat) &&
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const catsToRender = selectedCat === 'All'
    ? categories
    : categories.includes(selectedCat)
      ? [selectedCat]
      : [];

  return (
    <>
      {/* Branding Header */}
      <header className="customer-header d-flex align-items-center p-3">
        <img
          src="/Millennialscafe.jpg"
          alt="Millennials Cafe Logo"
          style={{ height: 40, marginRight: 12 }}
        />
        <h1 className="h4 mb-0">MILLENNIALS CAFE</h1>
      </header>

      <div className="container py-4 position-relative">
        {/* Top Controls */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Welcome, {user.name}</h2>
          <div>
            <button className="btn btn-outline-danger me-2" onClick={logout}>
              Logout
            </button>
            <button className="btn btn-outline-primary me-2" onClick={goToOrders}>
              My Orders
            </button>
            <button
              className="btn btn-success"
              onClick={goToCart}
              disabled={!Object.values(cart).some(q => q > 0) || settings.cafeClosed}
            >
              Go to Cart
            </button>
          </div>
        </div>

        {/* Inline Cart Widget */}
        <Cart cart={cart} menu={menu} inc={inc} dec={dec} />

        {/* Notices */}
        {settings.showNotes && (
          <div className="alert alert-warning">
            {settings.cafeClosed
              ? settings.note || 'Our cafe is currently closed.'
              : settings.note}
          </div>
        )}

        {/* Category & Search */}
        <div className="mb-3">
          <label htmlFor="categorySelect" className="form-label">Category</label>
          <input
            id="categorySelect"
            className="form-control mb-2"
            placeholder="All or type to search..."
            list="categoryList"
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
          />
          <datalist id="categoryList">
            <option value="All" />
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>

          <div className="d-flex flex-wrap gap-2 mt-2">
            <button
              className={`btn btn-sm ${selectedCat === 'All' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setSelectedCat('All')}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c}
                className={`btn btn-sm ${selectedCat === c ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setSelectedCat(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <input
            type="text"
            className="form-control mt-2"
            placeholder="Search items..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Menu Grid */}
        {catsToRender.map(cat => (
          <div key={cat} className="mb-5">
            <h3>{cat}</h3>
            <div className="row">
              {filteredMenu.filter(i => i.category === cat).map(item => (
                <div key={item._id} className="col-md-3 mb-3">
                  <div className="card h-100">
                    {item.image && (
                      <img
                        src={`http://localhost:3001${item.image}`}
                        className="card-img-top"
                        alt={item.name}
                      />
                    )}
                    <div className="card-body d-flex flex-column">
                      <h5 className="card-title">{item.name}</h5>
                      <p className="card-text">₹{item.price.toFixed(2)}</p>
                      <div className="mt-auto d-flex align-items-center">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => dec(item._id)}
                        >–</button>
                        <span className="mx-2">{cart[item._id] || 0}</span>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => inc(item._id)}
                        >+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredMenu.filter(i => i.category === cat).length === 0 && (
                <div className="col-12">
                  <p className="text-muted">No items in this category.</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
