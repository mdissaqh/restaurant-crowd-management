// frontend/src/components/CustomerOrders.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { formatDate } from '../utils/formatDate';
import { useNavigate } from 'react-router-dom';

export default function CustomerOrders() {
  const [orders, setOrders]       = useState([]);
  const [settings, setSettings]   = useState({ showNotes: false });
  const [selection, setSelection] = useState({});
  const [hover, setHover]         = useState({});
  const [comment, setComment]     = useState({});
  const [error, setError]         = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Fetching orders for mobile:', user.mobile);
    const sock = io('http://localhost:3001');

    // Load settings
    axios.get('http://localhost:3001/api/settings')
      .then(r => setSettings(r.data))
      .catch(err => console.error('Settings fetch error', err));

    // Load this customer’s orders
    axios.get('http://localhost:3001/api/myorders', {
      params: { mobile: user.mobile }
    })
      .then(r => {
        setOrders(r.data);
        setError(null);
      })
      .catch(err => {
        console.error('Orders fetch error', err);
        setError('Failed to load your orders. Please try again.');
      });

    sock.on('orderUpdated', updated => {
      if (updated.mobile === user.mobile) {
        setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
      }
    });
    sock.on('newOrder', newOrder => {
      if (newOrder.mobile === user.mobile) {
        setOrders(prev => [newOrder, ...prev]);
      }
    });

    return () => sock.disconnect();
  }, [user.mobile]);

  const active    = orders.filter(o => !['Completed','Delivered','Cancelled'].includes(o.status));
  const completed = orders.filter(o => ['Completed','Delivered','Cancelled'].includes(o.status));

  const submitFeedback = async orderId => {
    try {
      await axios.post('http://localhost:3001/api/order/feedback', {
        id: orderId,
        rating: selection[orderId],
        feedback: comment[orderId] || ''
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit feedback');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-link" onClick={() => navigate('/shop')}>
          ← Back to Shop
        </button>
        <h2>Your Orders</h2>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Active Orders */}
      <section className="mb-5">
        <h4>Active Orders</h4>
        {active.length === 0
          ? <p className="text-muted">No active orders.</p>
          : (
            <ul className="list-group">
              {active.map(o => (
                <li key={o._id} className="list-group-item">
                  <div><strong>Order ID:</strong> {o._id}</div>
                  <div>
                    <strong>Placed:</strong> {formatDate(o.createdAt)}{' '}
                    {new Date(o.createdAt).toLocaleTimeString()}
                  </div>
                  {o.serviceType === 'Delivery' &&
                    <div><strong>Address:</strong> {o.address}</div>}
                  <ul className="mb-2">
                    {o.items.map(i => (
                      <li key={i.id}>
                        {i.name} × {i.qty} = ₹{(i.price * i.qty).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                  <div><strong>Total:</strong> ₹{o.total.toFixed(2)}</div>
                  <div>
                    <strong>Status:</strong> {o.status}
                    {o.estimatedTime && <> — ET: {o.estimatedTime} min</>}
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </section>

      {/* Completed & Cancelled Orders */}
      <section>
        <h4>Completed & Cancelled</h4>
        {completed.length === 0
          ? <p className="text-muted">No completed or cancelled orders.</p>
          : (
            <ul className="list-group">
              {completed.map(o => (
                <li key={o._id} className="list-group-item">
                  <div><strong>Order ID:</strong> {o._id}</div>
                  <div>
                    <strong>Placed:</strong> {formatDate(o.createdAt)}{' '}
                    {new Date(o.createdAt).toLocaleTimeString()}
                  </div>
                  <div>
                    <strong>Completed:</strong>{' '}
                    {o.completedAt
                      ? `${formatDate(o.completedAt)} ${new Date(o.completedAt).toLocaleTimeString()}`
                      : '—'}
                  </div>
                  {o.serviceType === 'Delivery' &&
                    <div><strong>Address:</strong> {o.address}</div>}
                  <ul className="mb-2">
                    {o.items.map(i => (
                      <li key={i.id}>
                        {i.name} × {i.qty} = ₹{(i.price * i.qty).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                  <div><strong>Total:</strong> ₹{o.total.toFixed(2)}</div>
                  <div><strong>Status:</strong> {o.status}</div>
                  {o.status === 'Cancelled' && o.cancellationNote && (
                    <div className="mt-2 alert alert-danger">
                      <strong>Cancellation Reason:</strong> {o.cancellationNote}
                    </div>
                  )}

                  {/* Feedback form */}
                  {o.status !== 'Cancelled' && o.rating == null && (
                    <div className="mt-3">
                      <strong>Rate your experience:</strong>
                      <div>
                        {[1,2,3,4,5].map(n => (
                          <button
                            key={n}
                            type="button"
                            className={`btn-star ${n <= (hover[o._id]||selection[o._id]||0) ? 'star-lit' : ''}`}
                            onMouseEnter={() => setHover(prev=>({...prev,[o._id]:n}))}
                            onMouseLeave={() => setHover(prev=>({...prev,[o._id]:0}))}
                            onClick={() => setSelection(prev=>({...prev,[o._id]:n}))}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="form-control mt-2"
                        rows={2}
                        placeholder="Optional feedback"
                        value={comment[o._id]||''}
                        onChange={e => setComment(prev=>({...prev,[o._id]:e.target.value}))}
                      />
                      <button
                        className="btn btn-primary btn-sm mt-2"
                        onClick={() => submitFeedback(o._id)}
                        disabled={!selection[o._id]}
                      >
                        Submit Feedback
                      </button>
                    </div>
                  )}

                  {/* Display given feedback */}
                  {o.rating != null && (
                    <div className="mt-3">
                      <strong>Your Rating:</strong>{' '}
                      {'★'.repeat(o.rating)}{'☆'.repeat(5-o.rating)}
                      {o.feedback && <p className="mt-1">“{o.feedback}”</p>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )
        }
      </section>
    </div>
  );
}
