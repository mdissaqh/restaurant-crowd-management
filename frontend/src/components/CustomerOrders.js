import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { formatDate } from '../utils/formatDate';
import { FaStar, FaListAlt, FaShoppingBag, FaHistory, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({
    showNotes: false,
    cgstPercent: 0,
    sgstPercent: 0,
    deliveryCharge: 0
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('http://localhost:3001/api/settings'),
      axios.get('http://localhost:3001/api/myorders', { params: { mobile: user.mobile } })
    ])
      .then(([settingsRes, ordersRes]) => {
        setSettings(settingsRes.data);
        setOrders(ordersRes.data);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load your orders.');
        setLoading(false);
      });

    const sock = io('http://localhost:3001');
    sock.on('orderUpdated', upd => {
      if (upd.mobile === user.mobile) {
        setOrders(prev => prev.map(o => o._id===upd._id?upd:o));
      }
    });
    sock.on('newOrder', n => {
      if (n.mobile === user.mobile) setOrders(prev => [n, ...prev]);
    });
    sock.on('settingsUpdated', () => {
      axios.get('http://localhost:3001/api/settings')
        .then(r => setSettings(r.data))
        .catch(console.error);
    });
    
    return () => sock.disconnect();
  }, [user.mobile]);

  const active = orders.filter(o=>!['Completed','Delivered','Cancelled'].includes(o.status));
  const completed = orders.filter(o=>['Completed','Delivered','Cancelled'].includes(o.status));

  const renderAddress = addrStr => {
    try {
      const a = JSON.parse(addrStr);
      return `${a.flat}, ${a.area}, ${a.landmark}, ${a.city}, ${a.pincode}, ${a.mobile}`;
    } catch { return ''; }
  };

  function getStatusBadgeClass(status) {
    const statusMap = {
      'Pending': 'status-pending',
      'In Progress': 'status-in-progress',
      'Ready': 'status-ready',
      'Ready for Pickup': 'status-ready',
      'Out for Delivery': 'status-in-progress',
      'Delivered': 'status-delivered',
      'Completed': 'status-completed',
      'Cancelled': 'status-cancelled'
    };
    return `status-badge ${statusMap[status] || ''}`;
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">
              <FaListAlt className="me-2" /> Your Orders
            </h2>
            <button 
              className="btn btn-outline-primary"
              onClick={() => navigate('/shop')}
            >
              <FaArrowLeft className="me-2" /> Back to Menu
            </button>
          </div>
          
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Active Orders */}
          <div className="mb-5">
            <div className="d-flex align-items-center mb-3">
              <FaShoppingBag className="me-2 text-primary" />
              <h3 className="mb-0">Active Orders</h3>
            </div>
            
            {active.length === 0 ? (
              <div className="alert alert-info">
                <p className="mb-0">You don't have any active orders at the moment.</p>
              </div>
            ) : (
              <div className="row">
                {active.map(o => (
                  <div key={o._id} className="col-lg-6 mb-4">
                    <div className="card h-100">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Order #{o._id.slice(-6)}</h5>
                        <div className={getStatusBadgeClass(o.status)}>{o.status}</div>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <strong>Placed:</strong> {formatDate(o.createdAt)} {new Date(o.createdAt).toLocaleTimeString()}
                        </div>
                        
                        <div className="mb-3">
                          <strong>Service Type:</strong> {o.serviceType}
                        </div>
                        
                        {o.serviceType==='Delivery' && (
                          <div className="mb-3">
                            <strong>Address:</strong> {renderAddress(o.address)}
                          </div>
                        )}
                        
                        <div className="card mb-3">
                          <div className="card-header">
                            <strong>Order Items</strong>
                          </div>
                          <ul className="list-group list-group-flush">
                            {o.items.map(i => (
                              <li key={i.id} className="list-group-item d-flex justify-content-between">
                                <span>{i.name} × {i.qty}</span>
                                <span>₹{(i.price*i.qty).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="row mb-3">
                          <div className="col-6">
                            <strong>Subtotal:</strong> ₹{o.items.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2)}
                          </div>
                          <div className="col-6">
                            <strong>CGST ({settings.cgstPercent}%):</strong> ₹{(o.cgstAmount||0).toFixed(2)}
                          </div>
                          <div className="col-6">
                            <strong>SGST ({settings.sgstPercent}%):</strong> ₹{(o.sgstAmount||0).toFixed(2)}
                          </div>
                          {o.serviceType==='Delivery' && (
                            <div className="col-6">
                              <strong>Delivery Charge:</strong> ₹{(o.deliveryCharge||0).toFixed(2)}
                            </div>
                          )}
                        </div>
                        
                        <h5 className="mb-0">Total: ₹{o.total.toFixed(2)}</h5>
                        
                        {o.estimatedTime && (
                          <div className="alert alert-info mt-3">
                            <strong>Estimated Time:</strong> {o.estimatedTime} minutes
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed & Cancelled Orders */}
          <div>
            <div className="d-flex align-items-center mb-3">
              <FaHistory className="me-2 text-primary" />
              <h3 className="mb-0">Completed & Cancelled Orders</h3>
            </div>
            
            {completed.length === 0 ? (
              <div className="alert alert-info">
                <p className="mb-0">You don't have any completed or cancelled orders yet.</p>
              </div>
            ) : (
              <div className="row">
                {completed.map(o => (
                  <div key={o._id} className="col-lg-6 mb-4">
                    <div className="card h-100">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Order #{o._id.slice(-6)}</h5>
                        <div className={getStatusBadgeClass(o.status)}>{o.status}</div>
                      </div>
                      <div className="card-body">
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <strong>Placed:</strong> {formatDate(o.createdAt)} {new Date(o.createdAt).toLocaleTimeString()}
                          </div>
                          <div className="col-md-6">
                            <strong>Completed:</strong> {o.completedAt ? `${formatDate(o.completedAt)} ${new Date(o.completedAt).toLocaleTimeString()}` : '—'}
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <strong>Service Type:</strong> {o.serviceType}
                        </div>
                        
                        {o.serviceType==='Delivery' && (
                          <div className="mb-3">
                            <strong>Address:</strong> {renderAddress(o.address)}
                          </div>
                        )}
                        
                        <div className="card mb-3">
                          <div className="card-header">
                            <strong>Order Items</strong>
                          </div>
                          <ul className="list-group list-group-flush">
                            {o.items.map(i => (
                              <li key={i.id} className="list-group-item d-flex justify-content-between">
                                <span>{i.name} × {i.qty}</span>
                                <span>₹{(i.price*i.qty).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="row mb-3">
                          <div className="col-6">
                            <strong>Subtotal:</strong> ₹{o.items.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2)}
                          </div>
                          <div className="col-6">
                            <strong>CGST ({settings.cgstPercent}%):</strong> ₹{(o.cgstAmount||0).toFixed(2)}
                          </div>
                          <div className="col-6">
                            <strong>SGST ({settings.sgstPercent}%):</strong> ₹{(o.sgstAmount||0).toFixed(2)}
                          </div>
                          {o.serviceType==='Delivery' && (
                            <div className="col-6">
                              <strong>Delivery Charge:</strong> ₹{(o.deliveryCharge||0).toFixed(2)}
                            </div>
                          )}
                        </div>
                        
                        <h5 className="mb-0">Total: ₹{o.total.toFixed(2)}</h5>
                        
                        {o.status==='Cancelled' && o.cancellationNote && (
                          <div className="alert alert-danger mt-3">
                            <strong>Cancellation Reason:</strong> {o.cancellationNote}
                          </div>
                        )}

                        {/* Feedback form */}
                        {o.status!=='Cancelled' && o.rating==null && (
                          <FeedbackForm order={o} />
                        )}

                        {/* Display given feedback */}
                        {o.rating!=null && (
                          <div className="card mt-3">
                            <div className="card-header">
                              <strong>Your Feedback</strong>
                            </div>
                            <div className="card-body">
                              <div className="mb-2">
                                <strong>Rating:</strong> <span className="text-warning">{'★'.repeat(o.rating)}{'☆'.repeat(5-o.rating)}</span>
                              </div>
                              {o.feedback && (
                                <div>
                                  <strong>Comment:</strong>
                                  <p className="mb-0 fst-italic">"{o.feedback}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackForm({ order }) {
  const [hover, setHover] = useState(0);
  const [sel, setSel] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    if (!sel) return;
    
    setSubmitting(true);
    try {
      await axios.post('http://localhost:3001/api/order/feedback', {
        id: order._id,
        rating: sel,
        feedback: comment
      });
      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="alert alert-success mt-3 fade-in-up">
        <FaStar className="me-2" />
        Thank you for your feedback!
      </div>
    );
  }

  return (
    <div className="card mt-3">
      <div className="card-header">
        <strong>Rate Your Experience</strong>
      </div>
      <div className="card-body">
        <div className="mb-3 text-center">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              type="button"
              className={`btn-star ${n <= (hover||sel) ? 'star-lit' : ''}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setSel(n)}
              disabled={submitting}
            >
              ★
            </button>
          ))}
        </div>
        
        <div className="mb-3">
          <label className="form-label">Comments (Optional)</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Tell us about your experience..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            disabled={submitting}
          />
        </div>
        
        <button
          className="btn btn-primary w-100"
          disabled={!sel || submitting}
          onClick={submit}
        >
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Submitting...
            </>
          ) : (
            'Submit Feedback'
          )}
        </button>
      </div>
    </div>
  );
}
