// frontend/src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaMobileAlt, FaSignInAlt, FaStore } from 'react-icons/fa';

export default function Login() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const navigate = useNavigate();

  // Validate name to only allow letters and spaces
  const validateName = (value) => {
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!value.trim()) {
      setNameError('Name is required');
      return false;
    } else if (!nameRegex.test(value)) {
      setNameError('Name should only contain letters and spaces');
      return false;
    } else if (value.trim().length < 2) {
      setNameError('Name should be at least 2 characters long');
      return false;
    } else {
      setNameError('');
      return true;
    }
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    // Allow only letters and spaces during typing
    const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
    setName(filteredValue);
    
    if (filteredValue !== value) {
      setNameError('Only letters and spaces are allowed');
    } else {
      validateName(filteredValue);
    }
  };

  const submit = e => {
    e.preventDefault();
    setLoading(true);
    
    // Validate name
    if (!validateName(name)) {
      setLoading(false);
      return;
    }
    
    // Validate mobile
    if (mobile.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      setLoading(false);
      return;
    }
    
    localStorage.setItem('user', JSON.stringify({ name: name.trim(), mobile: `+91${mobile}` }));
    setTimeout(() => {
      setLoading(false);
      navigate('/shop');
    }, 800);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <img
                src="/Millennialscafe.jpg"
                alt="Millennials Cafe Logo"
                className="login-logo"
              />
              <FaStore className="store-icon" />
            </div>
            <h1 className="cafe-title">MILLENNIALS CAFE</h1>
            <p className="login-subtitle">Welcome to Your Favorite Cafe</p>
          </div>
          
          <div className="login-body">
            <form onSubmit={submit} className="login-form">
              <div className="form-group">
                <label className="form-label">
                  <FaUser className="input-icon" />
                  Your Name
                </label>
                <input
                  type="text"
                  className={`form-control ${nameError ? 'is-invalid' : name.trim() ? 'is-valid' : ''}`}
                  required
                  placeholder="Enter your full name"
                  value={name}
                  onChange={handleNameChange}
                  maxLength={50}
                />
                {nameError && <div className="invalid-feedback">{nameError}</div>}
                {!nameError && name.trim() && (
                  <div className="valid-feedback">Looks good!</div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <FaMobileAlt className="input-icon" />
                  Mobile Number
                </label>
                <div className="mobile-input-group">
                  <span className="country-code">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/en/4/41/Flag_of_India.svg"
                      alt="India Flag"
                      className="flag-icon"
                    />
                    +91
                  </span>
                  <input
                    type="tel"
                    className={`form-control mobile-input ${mobile.length === 10 ? 'is-valid' : mobile.length > 0 ? 'is-invalid' : ''}`}
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
                <div className="form-help">
                  {mobile.length > 0 && mobile.length < 10 && (
                    <small className="text-danger">
                      Please enter {10 - mobile.length} more digit{10 - mobile.length !== 1 ? 's' : ''}
                    </small>
                  )}
                  {mobile.length === 10 && (
                    <small className="text-success">Perfect! Valid mobile number</small>
                  )}
                </div>
              </div>
              
              <button 
                type="submit" 
                className="login-button"
                disabled={loading || !name.trim() || nameError || mobile.length !== 10}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Logging in...
                  </>
                ) : (
                  <>
                    <FaSignInAlt className="me-2" />
                    Login & Start Ordering
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="login-footer">
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">🍕</span>
                <span>Fresh Food</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🚚</span>
                <span>Fast Delivery</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⭐</span>
                <span>Quality Service</span>
              </div>
            </div>
            <small className="privacy-text">
              By logging in, you agree to our Terms of Service and Privacy Policy
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
