import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import Cart from './Cart';
import { FaSearch, FaShoppingCart, FaSignOutAlt, FaListAlt } from 'react-icons/fa';

export default function CustomerShop() {
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '{}'));
  const [settings, setSettings] = useState({
    dineInEnabled: true,
    takeawayEnabled: true,
    deliveryEnabled: true,
    cafeClosed: false,
    showNotes: false,
    note: ''
  });
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('http://localhost:3001/api/menu'),
      axios.get('http://localhost:3001/api/settings')
    ]).then(([menuRes, settingsRes]) => {
      setMenu(menuRes.data);
      setCategories([...new Set(menuRes.data.map(i => i.category))]);
      setSettings(settingsRes.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });

    const sock = io('http://localhost:3001');
    
    // Listen for settings updates
    sock.on('settingsUpdated', () => {
      axios.get('http://localhost:3001/api/settings')
        .then(r => setSettings(r.data))
        .catch(console.error);
    });
    
    // Listen for menu updates
    sock.on('menuUpdated', () => {
      axios.get('http://localhost:3001/api/menu')
        .then(r => {
          setMenu(r.data);
          setCategories([...new Set(r.data.map(i => i.category))]);
        })
        .catch(console.error);
    });

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

  const logout = () => { 
    localStorage.removeItem('user'); 
    navigate('/login'); 
  };
  
  const goToCart = () => navigate('/cart');
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

  const getItemsInCart = () => Object.values(cart).reduce((a, b) => a + b, 0);

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
      {/* Branding Header */}
      <header className="customer-header d-flex align-items-center p-3">
        <img
          src="/Millennialscafe.jpg"
          alt="Millennials Cafe Logo"
          style={{ height: 50, marginRight: 16 }}
        />
        <h1 className="mb-0">MILLENNIALS CAFE</h1>
      </header>

      <div className="container py-4 position-relative">
        {/* Top Controls */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center">
              <h2 className="mb-0">Welcome, {user.name}</h2>
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-outline-danger" 
                  onClick={logout}
                >
                  <FaSignOutAlt className="me-2" /> Logout
                </button>
                <button 
                  className="btn btn-outline-primary" 
                  onClick={goToOrders}
                >
                  <FaListAlt className="me-2" /> My Orders
                </button>
                <button
                  className="btn btn-success"
                  onClick={goToCart}
                  disabled={!Object.values(cart).some(q => q > 0) || settings.cafeClosed}
                >
                  <FaShoppingCart className="me-2" /> Go to Cart
                  {getItemsInCart() > 0 && (
                    <span className="badge bg-light text-dark ms-2">
                      {getItemsInCart()}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Inline Cart Widget */}
        <Cart cart={cart} menu={menu} />

        {/* Notices */}
        {settings.showNotes && (
          <div className="alert alert-warning mb-4">
            {settings.cafeClosed
              ? settings.note || 'Our cafe is currently closed.'
              : settings.note}
          </div>
        )}

        {/* Category & Search */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="categorySelect" className="form-label">Category</label>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    className={`btn ${selectedCat === 'All' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedCat('All')}
                  >
                    All
                  </button>
                  {categories.map(c => (
                    <button
                      key={c}
                      className={`btn ${selectedCat === c ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setSelectedCat(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="col-md-6">
                <label htmlFor="searchItems" className="form-label">Search</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaSearch />
                  </span>
                  <input
                    id="searchItems"
                    type="text"
                    className="form-control"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        {catsToRender.map(cat => (
          <div key={cat} className="mb-5">
            <h3 className="mb-3">{cat}</h3>
            <div className="menu-grid">
              {filteredMenu.filter(i => i.category === cat).map(item => (
                <div key={item._id} className="card h-100 menu-item-card">
                  {item.image && (
                    <img
                      src={`http://localhost:3001${item.image}`}
                      className="card-img-top menu-item-image"
                      alt={item.name}
                    />
                  )}
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{item.name}</h5>
                    <p className="card-text text-primary fw-bold">₹{item.price.toFixed(2)}</p>
                    <div className="mt-auto">
                      <div className="quantity-controls">
                        <button
                          className="btn btn-outline-secondary quantity-btn"
                          onClick={() => dec(item._id)}
                        >–</button>
                        <span className="quantity-display">{cart[item._id] || 0}</span>
                        <button
                          className="btn btn-outline-secondary quantity-btn"
                          onClick={() => inc(item._id)}
                        >+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredMenu.filter(i => i.category === cat).length === 0 && (
                <div className="alert alert-info w-100">
                  <p className="mb-0">No items in this category.</p>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* No results message */}
        {filteredMenu.length === 0 && (
          <div className="alert alert-warning">
            <p className="mb-0">No items match your search. Try a different term or category.</p>
          </div>
        )}
      </div>
    </>
  );
}
