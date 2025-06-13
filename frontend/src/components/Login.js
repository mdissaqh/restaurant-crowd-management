import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaMobileAlt, FaSignInAlt } from 'react-icons/fa';

export default function Login() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = e => {
    e.preventDefault();
    setLoading(true);
    
    if (mobile.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      setLoading(false);
      return;
    }
    
    localStorage.setItem('user', JSON.stringify({ name, mobile: `+91${mobile}` }));
    setTimeout(() => {
      setLoading(false);
      navigate('/shop');
    }, 800);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center py-5" 
      style={{ 
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      }}
    >
      <div className="card" style={{ maxWidth: 450, width: '100%' }}>
        <div className="card-header text-center bg-primary text-white py-3">
          <img
            src="/Millennialscafe.jpg"
            alt="Millennials Cafe Logo"
            style={{ height: 60, marginBottom: 16 }}
            className="rounded"
          />
          <h2 className="mb-0">MILLENNIALS CAFE</h2>
          <p className="mb-0 mt-2">Customer Login</p>
        </div>
        
        <div className="card-body p-4">
          <form onSubmit={submit}>
            <div className="mb-4">
              <label className="form-label">
                <FaUser className="me-2" />
                Your Name
              </label>
              <input
                type="text"
                className="form-control form-control-lg"
                required
                placeholder="Enter your name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            
            <div className="mb-4">
              <label className="form-label">
                <FaMobileAlt className="me-2" />
                Mobile Number
              </label>
              <div className="input-group input-group-lg">
                <span className="input-group-text">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/en/4/41/Flag_of_India.svg"
                    alt="India Flag"
                    style={{ width: '1.2em', marginRight: '0.4em' }}
                  />
                  +91
                </span>
                <input
                  type="tel"
                  className="form-control"
                  required
                  pattern="\d{10}"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setMobile(val);
                  }}
                />
              </div>
              <div className="form-text">
                Please enter a valid 10-digit mobile number
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary btn-lg w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Logging in...
                </>
              ) : (
                <>
                  <FaSignInAlt className="me-2" />
                  Login
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="card-footer text-center py-3 text-muted">
          <small>
            By logging in, you agree to our Terms of Service and Privacy Policy
          </small>
        </div>
      </div>
    </div>
  );
}
