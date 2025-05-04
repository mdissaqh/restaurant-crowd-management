import React, { useState } from 'react';
import axios from 'axios';

export default function LoginModal({ show, onClose, onLogin }) {
  const [mode, setMode] = useState('login'); // or 'signup'
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');

  const submit = async e => {
    e.preventDefault();
    const url = mode==='login' ? '/api/auth/login' : '/api/auth/signup';
    const { data } = await axios.post(`http://localhost:3001${url}`, mode==='login' ? { mobile } : { name, mobile });
    localStorage.setItem('user', JSON.stringify(data));
    onLogin(data);
  };

  if (!show) return null;
  return (
    <div className="modal show d-block" onClick={onClose}>
      <div className="modal-dialog" onClick={e=>e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5>{mode==='login' ? 'Login' : 'Sign Up'}</h5>
            <button className="btn-close" onClick={onClose}/>
          </div>
          <form onSubmit={submit} className="modal-body">
            {mode==='signup' && (
              <div className="mb-3">
                <label>Name</label>
                <input required className="form-control" value={name} onChange={e=>setName(e.target.value)} />
              </div>
            )}
            <div className="mb-3">
              <label>Mobile</label>
              <input required className="form-control" value={mobile} onChange={e=>setMobile(e.target.value)} />
            </div>
            <button className="btn btn-primary w-100">{mode==='login' ? 'Login' : 'Sign Up'}</button>
          </form>
          <div className="modal-footer">
            <button className="btn btn-link" onClick={()=>setMode(mode==='login'?'signup':'login')}>
              {mode==='login' ? 'New user? Sign up' : 'Already registered? Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
