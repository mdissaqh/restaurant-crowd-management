// frontend/src/components/CustomerShop.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import Cart from './Cart';
import { FaSearch, FaShoppingCart, FaSignOutAlt, FaListAlt, FaTimes, FaSpinner } from 'react-icons/fa';

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
  const [socket, setSocket] = useState(null);
  const [updateNotification, setUpdateNotification] = useState('');
  
  // Image modal states
  const [modalImage, setModalImage] = useState(null);
  const [modalImageLoading, setModalImageLoading] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState({});

  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  // Fetch menu data
  const fetchMenu = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/menu');
      setMenu(response.data);
      setCategories([...new Set(response.data.map(i => i.category))]);
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  // Fetch settings data
  const fetchSettings = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMenu(), fetchSettings()])
      .then(() => setLoading(false))
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // Initialize socket connection
    const sock = io('http://localhost:3001');
    setSocket(sock);
   
    // Listen for real-time updates
    sock.on('menuUpdated', () => {
      console.log('Menu updated - refreshing menu data');
      fetchMenu();
      showUpdateNotification('Menu has been updated!');
    });
   
    sock.on('settingsUpdated', () => {
      console.log('Settings updated - refreshing settings data');
      fetchSettings();
      showUpdateNotification('Store settings have been updated!');
    });

    // Clean up socket connection
    return () => {
      if (sock) {
        sock.disconnect();
      }
    };
  }, []);

  // Keyboard event handler for modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && modalImage) {
        setModalImage(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalImage]);

  // Show update notification
  const showUpdateNotification = (message) => {
    setUpdateNotification(message);
    setTimeout(() => {
      setUpdateNotification('');
    }, 3000);
  };

  // Handle image click for modal view
  const handleImageClick = (imageSrc, itemName) => {
    setModalImageLoading(true);
    setModalImage({ src: imageSrc, alt: itemName });
  };

  // Handle image load state
  const handleImageLoad = (itemId) => {
    setImageLoadingStates(prev => ({ ...prev, [itemId]: false }));
    if (modalImage) {
      setModalImageLoading(false);
    }
  };

  const handleImageLoadStart = (itemId) => {
    setImageLoadingStates(prev => ({ ...prev, [itemId]: true }));
  };

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
 
  // Updated logic: Only show categories that have matching items when searching
  const catsToRender = selectedCat === 'All'
    ? searchTerm.trim()
      ? [...new Set(filteredMenu.map(item => item.category))] // Only categories with matching items when searching
      : categories // All categories when no search term
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

      {/* Real-time Update Notification */}
      {updateNotification && (
        <div className="alert alert-success alert-dismissible fade show position-fixed"
             style={{ top: '100px', right: '20px', zIndex: 1050, minWidth: '300px' }}>
          <strong>Update!</strong> {updateNotification}
        </div>
      )}

      {/* Image Modal */}
      {modalImage && (
        <div className="image-modal-overlay" onClick={() => setModalImage(null)}>
          <div className="image-modal-container">
            <button 
              className="image-modal-close"
              onClick={() => setModalImage(null)}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
            
            {modalImageLoading && (
              <div className="image-modal-loading">
                <FaSpinner className="spinner" />
                <span>Loading image...</span>
              </div>
            )}
            
            <img
              src={modalImage.src}
              alt={modalImage.alt}
              className="image-modal-img"
              onClick={(e) => e.stopPropagation()}
              onLoad={() => setModalImageLoading(false)}
              style={{ display: modalImageLoading ? 'none' : 'block' }}
            />
            
            <div className="image-modal-caption">
              {modalImage.alt}
            </div>
          </div>
        </div>
      )}

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
            <div className="menu-grid-enhanced">
              {filteredMenu.filter(i => i.category === cat).map(item => (
                <div key={item._id} className="card h-100 menu-item-card-enhanced">
                  {item.image && (
                    <div className="menu-image-container">
                      {imageLoadingStates[item._id] && (
                        <div className="image-loading-overlay">
                          <FaSpinner className="spinner" />
                        </div>
                      )}
                      
                      <img
                        src={`http://localhost:3001${item.image}`}
                        className="menu-item-image-enhanced"
                        alt={item.name}
                        onLoadStart={() => handleImageLoadStart(item._id)}
                        onLoad={() => handleImageLoad(item._id)}
                        onClick={() => handleImageClick(`http://localhost:3001${item.image}`, item.name)}
                      />
                    </div>
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
            </div>
          </div>
        ))}
       
        {/* No results message - Only show when no categories have matching items */}
        {catsToRender.length === 0 && (
          <div className="alert alert-warning">
            <p className="mb-0">No items match your search. Try a different term or category.</p>
          </div>
        )}
      </div>
    </>
  );
}
