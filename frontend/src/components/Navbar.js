import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoginModal from './LoginModal';
import { FaShoppingCart, FaUser, FaClipboardList } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ cartCount }) {
  const [user, setUser]       = useState(() => JSON.parse(localStorage.getItem('user')));
  const [showModal, setShow]  = useState(false);
  const [settings, setSettings] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:3001/api/settings').then(r => setSettings(r.data));
  }, []);

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <>
      <nav className="navbar navbar-light bg-light px-4">
        <span className="navbar-brand">
          {settings.logoUrl && <img src={`http://localhost:3001${settings.logoUrl}`} height="40" alt="logo" />} 
          {settings.restaurantName}
        </span>
        <div>
          <button onClick={() => navigate('/cart')} className="btn position-relative me-3">
            <FaShoppingCart/>
            <span className="badge bg-warning rounded-pill position-absolute top-0 start-100">
              {cartCount}
            </span>
          </button>
          <button onClick={() => user ? navigate('/my-orders') : setShow(true)} className="btn me-3">
            <FaClipboardList/>
          </button>
          <button onClick={() => user ? logout() : setShow(true)} className="btn">
            <FaUser/>
            {user ? user.name : 'Login / Sign up'}
          </button>
        </div>
      </nav>
      <LoginModal show={showModal} onClose={()=>setShow(false)} onLogin={u=>{ setUser(u); setShow(false); }} />
    </>
  );
}
