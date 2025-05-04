import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { formatDate } from '../utils/formatDate';

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const sock = io('http://localhost:3001');
    axios
      .get(`http://localhost:3001/api/myorders?mobile=${user.mobile}`)
      .then(r => setOrders(r.data));
    sock.on('orderUpdated', o => {
      if (o.mobile === user.mobile) setOrders(prev => prev.map(x => x._id === o._id ? o : x));
    });
    sock.on('newOrder', o => {
      if (o.mobile === user.mobile) setOrders(prev => [o, ...prev]);
    });
    return () => sock.disconnect();
  }, [user.mobile]);

  const active = orders.filter(o => !['Completed', 'Delivered', 'Cancelled'].includes(o.status));
  const completed = orders.filter(o => ['Completed', 'Delivered', 'Cancelled'].includes(o.status));

  return (
    <div className="container py-4">
      <h2>Your Orders</h2>

      <section className="mb-4">
        <h4>Active Orders</h4>
        <ul className="list-group">
          {active.map(o => (
            <li key={o._id} className="list-group-item">
              <div><strong>Order ID:</strong> {o._id}</div>
              <div><strong>Placed at:</strong> {formatDate(o.createdAt)} {new Date(o.createdAt).toLocaleTimeString()}</div>
              {o.serviceType === 'Delivery' && <div><strong>Address:</strong> {o.address}</div>}
              <ul>{o.items.map(i => <li key={i.id}>{i.name}: ₹{i.price}×{i.qty}</li>)}</ul>
              <div><strong>Total:</strong> ₹{o.total.toFixed(2)}</div>
              <div>
                <strong>Status:</strong> {o.status}
                {o.estimatedTime && (<><strong> — Estimated time:</strong> {o.estimatedTime} minutes</>)}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4>Completed Orders</h4>
        <ul className="list-group">
          {completed.map(o => (
            <li key={o._id} className="list-group-item">
              <div><strong>Order ID:</strong> {o._id}</div>
              <div><strong>Placed at:</strong> {formatDate(o.createdAt)} {new Date(o.createdAt).toLocaleTimeString()}</div>
              <div><strong>Completed at:</strong> {o.completedAt ? `${formatDate(o.completedAt)} ${new Date(o.completedAt).toLocaleTimeString()}` : '—'}</div>
              {o.serviceType === 'Delivery' && <div><strong>Address:</strong> {o.address}</div>}
              <ul>{o.items.map(i => <li key={i.id}>{i.name}: ₹{i.price}×{i.qty}</li>)}</ul>
              <div><strong>Total:</strong> ₹{o.total.toFixed(2)}</div>
              <div><strong>Status:</strong> {o.status}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
