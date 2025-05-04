import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { formatDate } from '../utils/formatDate';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    axios.get('/order/my').then(r => setOrders(r.data));
    const sock = io();
    sock.on('orderUpdated', o => {
      setOrders(prev => prev.map(x => x._id === o._id ? o : x));
    });
    return () => sock.disconnect();
  }, []);

  const active = orders.filter(o => !['Completed','Delivered','Cancelled'].includes(o.status));
  const done   = orders.filter(o => ['Completed','Delivered','Cancelled'].includes(o.status));

  return (
    <div className="container py-4">
      <h2>My Orders</h2>
      <section>
        <h4>Active</h4>
        {active.map(o => (
          <div key={o._id} className="card mb-2 p-2">
            <p><strong>ID:</strong> {o._id}</p>
            <p><strong>Status:</strong> {o.status}</p>
            <p><strong>Placed:</strong> {formatDate(o.createdAt)}</p>
          </div>
        ))}
      </section>
      <section className="mt-4">
        <h4>Past</h4>
        {done.map(o => (
          <div key={o._id} className="card mb-2 p-2">
            <p><strong>ID:</strong> {o._id}</p>
            <p><strong>Status:</strong> {o.status}</p>
            {o.cancelNote && <p><strong>Note:</strong> {o.cancelNote}</p>}
            <p><strong>Completed:</strong> {formatDate(o.completedAt)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
