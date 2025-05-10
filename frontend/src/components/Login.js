import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const navigate = useNavigate();

  const submit = e => {
    e.preventDefault();
    // Validate mobile length before proceeding
    if (mobile.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    localStorage.setItem('user', JSON.stringify({ name, mobile: `+91${mobile}` }));
    navigate('/shop');
  };

  return (
    <div className="container py-5" style={{ maxWidth: 400 }}>
      <h2>Customer Login</h2>
      <form onSubmit={submit}>
        <div className="mb-3">
          <label className="form-label">Name</label>
          <input
            type="text"
            className="form-control"
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Mobile</label>
          <div className="input-group">
            <span className="input-group-text" style={{ padding: '0.375rem 0.75rem' }}>
              <img
                src="https://upload.wikimedia.org/wikipedia/en/4/41/Flag_of_India.svg"
                alt="India Flag"
                style={{ width: '1.2em', marginRight: '0.4em', verticalAlign: 'middle' }}
              />
              +91
            </span>
            <input
              type="tel"
              className="form-control"
              required
              pattern="\d{10}"
              maxLength={10}
              placeholder="Enter 10-digit mobile"
              value={mobile}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 10) setMobile(val);
              }}
            />
          </div>
          <div className="form-text">Please enter a 10-digit mobile number.</div>
        </div>
        <button type="submit" className="btn btn-primary w-100">Login</button>
      </form>
    </div>
  );
}
