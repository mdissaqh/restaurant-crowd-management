import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function SettingsPage() {
  const [s, setS] = useState(null);
  const [form, setForm] = useState({ restaurantName:'', logoUrl:'', cgst:0, sgst:0, deliveryFee:0, packagingCharge:0 });

  useEffect(()=>{
    axios.get('/api/settings').then(r=>{ setS(r.data); setForm({
      restaurantName: r.data.restaurantName,
      logoUrl: r.data.logoUrl,
      cgst: r.data.tax.cgst,
      sgst: r.data.tax.sgst,
      deliveryFee: r.data.deliveryFee,
      packagingCharge: r.data.packagingCharge,
    }); });
  },[]);

  const save = ()=>{
    axios.post('/api/settings', {
      restaurantName: form.restaurantName,
      logoUrl: form.logoUrl,
      tax: { cgst: form.cgst, sgst: form.sgst },
      deliveryFee: form.deliveryFee,
      packagingCharge: form.packagingCharge
    }).then(r=>setS(r.data));
  };

  if (!s) return null;
  return (
    <div>
      <h3>Settings</h3>
      {['restaurantName','logoUrl','cgst','sgst','deliveryFee','packagingCharge'].map(key=> (
        <div key={key} className="mb-3">
          <label className="form-label">{key}</label>
          <input
            type={['cgst','sgst','deliveryFee','packagingCharge'].includes(key)?'number':'text'}
            className="form-control"
            value={form[key]}
            onChange={e=>setForm({...form,[key]:e.target.value})}
          />
        </div>
      ))}
      <button className="btn btn-primary" onClick={save}>Save</button>
    </div>
  );
}