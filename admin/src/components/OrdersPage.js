import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = () => {
    axios.get('/api/orders').then(r => setOrders(r.data));
  };

  useEffect(fetchOrders, []);

  const nextStatus = o => {
    const flow = o.serviceType!=='Delivery'
      ? ['Pending','In Progress','Ready','Completed']
      : ['Pending','In Progress','Ready for Pickup','Out for Delivery','Delivered'];
    const idx = flow.indexOf(o.status);
    if (idx<0||idx===flow.length-1) return;
    const next = flow[idx+1];
    const payload = { id:o._id, status:next };
    if (next==='In Progress') {
      const mins = prompt('Enter estimated time (minutes):');
      if (!mins) return;
      payload.estimatedTime = mins;
    }
    axios.post('/api/order/update', payload).then(fetchOrders);
  };

  return (
    <div>
      <h3>Manage Orders</h3>
      <ul className="list-group">
        {orders.map(o=> (
          <li key={o._id} className="list-group-item">
            <div>{o.name} ({o.mobile}) – ₹{o.total.toFixed(2)}</div>
            <div>Status: {o.status} {o.estimatedTime?'– ETA '+o.estimatedTime+'m':''}</div>
            <button className="btn btn-sm btn-info me-2" onClick={()=>nextStatus(o)}>Next Status</button>
            <button className="btn btn-sm btn-danger" onClick={()=>{
              const note = prompt('Cancellation note:');
              if (!note) return;
              axios.post('/api/order/update', { id:o._id, status:'Cancelled', note }).then(fetchOrders);
            }}>Cancel</button>
          </li>
        ))}
      </ul>
    </div>
  );
}