import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function MenuManagementPage() {
  const [menu, setMenu] = useState([]);
  const [newItem, setNewItem] = useState({ name:'', price:'', category:'' });

  const fetchMenu = () => axios.get('/api/menu').then(r=>setMenu(r.data));
  useEffect(fetchMenu, []);

  const add = e=>{
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', newItem.name);
    fd.append('price', newItem.price);
    fd.append('category', newItem.category);
    // skip image here
    axios.post('/api/menu', fd).then(fetchMenu);
  };

  const remove = id => axios.delete(`/api/menu/${id}`).then(fetchMenu);

  return (
    <div>
      <h3>Menu Management</h3>
      <form onSubmit={add} className="mb-3">
        <input className="form-control mb-1" placeholder="Name" value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})} />
        <input className="form-control mb-1" placeholder="Price" value={newItem.price} onChange={e=>setNewItem({...newItem,price:e.target.value})} />
        <input className="form-control mb-1" placeholder="Category" value={newItem.category} onChange={e=>setNewItem({...newItem,category:e.target.value})} />
        <button className="btn btn-primary">Add Item</button>
      </form>
      <ul className="list-group">
        {menu.map(i=> (
          <li key={i._id} className="list-group-item d-flex justify-content-between">
            {i.name} – ₹{i.price.toFixed(2)}
            <button className="btn btn-sm btn-danger" onClick={()=>remove(i._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}