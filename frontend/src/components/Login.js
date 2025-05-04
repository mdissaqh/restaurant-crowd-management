import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const navigate = useNavigate();

  const submit = e => {
    e.preventDefault();
    localStorage.setItem('user', JSON.stringify({ name, mobile }));
    navigate('/shop');
  };

  return (
    <div className="container py-5" style={{ maxWidth: 400 }}>
      <h2>Customer Login</h2>
      <form onSubmit={submit}>
        <div className="mb-3">
          <label>Name</label>
          <input className="form-control" required value={name}
                 onChange={e=>setName(e.target.value)} />
        </div>
        <div className="mb-3">
          <label>Mobile</label>
          <input className="form-control" required value={mobile}
                 onChange={e=>setMobile(e.target.value)} />
        </div>
        <button className="btn btn-primary">Login</button>
      </form>
    </div>
  );
}
