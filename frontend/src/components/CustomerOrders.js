import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { formatDate } from '../utils/formatDate';

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({
    showNotes: false,
    cgstPercent: 0,
    sgstPercent: 0,
    deliveryCharge: 0
  });
  const [error, setError] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    axios.get('http://localhost:3001/api/settings')
      .then(r => setSettings(r.data))
      .catch(console.error);

    const fetch = () => {
      axios.get('http://localhost:3001/api/myorders', { params: { mobile: user.mobile } })
        .then(r => { setOrders(r.data); setError(null); })
        .catch(() => setError('Failed to load your orders.'));
    };

    fetch();
    const sock = io('http://localhost:3001');
    sock.on('orderUpdated', upd => {
      if (upd.mobile === user.mobile) {
        setOrders(prev => prev.map(o => o._id===upd._id?upd:o));
      }
    });
    sock.on('newOrder', n => {
      if (n.mobile === user.mobile) setOrders(prev => [n, ...prev]);
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

  return (
    <div className="container py-4">
      <h2>Your Orders</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Active */}
      <section className="mb-5">
        <h4>Active Orders</h4>
        {active.length===0
          ? <p className="text-muted">No active orders.</p>
          : active.map(o=>(
            <div key={o._id} className="card mb-2 p-3">
              <div><strong>Order ID:</strong> {o._id}</div>
              <div><strong>Placed:</strong> {formatDate(o.createdAt)} {new Date(o.createdAt).toLocaleTimeString()}</div>
              {o.serviceType==='Delivery' && <div><strong>Address:</strong> {renderAddress(o.address)}</div>}
              <ul>{o.items.map(i=>(
                <li key={i.id}>{i.name} × {i.qty} = ₹{(i.price*i.qty).toFixed(2)}</li>
              ))}</ul>
              <div><strong>Subtotal:</strong> ₹{o.items.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2)}</div>
              <div><strong>CGST ({settings.cgstPercent}%):</strong> ₹{(o.cgstAmount||0).toFixed(2)}</div>
              <div><strong>SGST ({settings.sgstPercent}%):</strong> ₹{(o.sgstAmount||0).toFixed(2)}</div>
              {o.serviceType==='Delivery' && (
                <div><strong>Delivery Charge:</strong> ₹{(o.deliveryCharge||0).toFixed(2)}</div>
              )}
              <div><strong>Total:</strong> ₹{o.total.toFixed(2)}</div>
              <div><strong>Status:</strong> {o.status}{o.estimatedTime?` — ET: ${o.estimatedTime} min`:''}</div>
            </div>
          ))
        }
      </section>

      {/* Completed & Cancelled */}
      <section>
        <h4>Completed & Cancelled Orders</h4>
        {completed.length===0
          ? <p className="text-muted">No completed or cancelled orders.</p>
          : completed.map(o=>(
            <div key={o._id} className="card mb-2 p-3">
              <div><strong>Order ID:</strong> {o._id}</div>
              <div><strong>Placed:</strong> {formatDate(o.createdAt)} {new Date(o.createdAt).toLocaleTimeString()}</div>
              <div><strong>Completed:</strong> {o.completedAt ? `${formatDate(o.completedAt)} ${new Date(o.completedAt).toLocaleTimeString()}` : '—'}</div>
              {o.serviceType==='Delivery' && <div><strong>Address:</strong> {renderAddress(o.address)}</div>}
              <ul>{o.items.map(i=>(
                <li key={i.id}>{i.name} × {i.qty} = ₹{(i.price*i.qty).toFixed(2)}</li>
              ))}</ul>
              <div><strong>Subtotal:</strong> ₹{o.items.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2)}</div>
              <div><strong>CGST ({settings.cgstPercent}%):</strong> ₹{(o.cgstAmount||0).toFixed(2)}</div>
              <div><strong>SGST ({settings.sgstPercent}%):</strong> ₹{(o.sgstAmount||0).toFixed(2)}</div>
              {o.serviceType==='Delivery' && (
                <div><strong>Delivery Charge:</strong> ₹{(o.deliveryCharge||0).toFixed(2)}</div>
              )}
              <div><strong>Total:</strong> ₹{o.total.toFixed(2)}</div>
              <div><strong>Status:</strong> {o.status}</div>
              {o.status==='Cancelled'&&o.cancellationNote&&(
                <div className="mt-2 alert alert-danger">
                  <strong>Cancellation Reason:</strong> {o.cancellationNote}
                </div>
              )}

              {/* Feedback form */}
              {o.status!=='Cancelled'&&o.rating==null&&(
                <FeedbackForm order={o}/>
              )}

              {/* Display given feedback */}
              {o.rating!=null&&(
                <div className="mt-3">
                  <strong>Your Rating:</strong> {'★'.repeat(o.rating)}{'☆'.repeat(5-o.rating)}
                  {o.feedback&&<p className="mt-1">“{o.feedback}”</p>}
                </div>
              )}
            </div>
          ))
        }
      </section>
    </div>
  );
}

function FeedbackForm({ order }) {
  const [hover, setHover] = useState(0);
  const [sel, setSel] = useState(0);
  const [comment, setComment] = useState('');
  const submit = async () => {
    await axios.post('http://localhost:3001/api/order/feedback', {
      id: order._id,
      rating: sel,
      feedback: comment
    });
  };
  return (
    <div className="mt-3">
      <strong>Rate your experience:</strong>
      <div>
        {[1,2,3,4,5].map(n=>(
          <button
            key={n} type="button"
            className={`btn-star ${n <= (hover||sel) ? 'star-lit':''}`}
            onMouseEnter={()=>setHover(n)}
            onMouseLeave={()=>setHover(0)}
            onClick={()=>setSel(n)}
          >★</button>
        ))}
      </div>
      <textarea
        className="form-control mt-2"
        rows={2}
        placeholder="Optional feedback"
        value={comment}
        onChange={e=>setComment(e.target.value)}
      />
      <button
        className="btn btn-primary btn-sm mt-2"
        disabled={!sel}
        onClick={submit}
      >Submit Feedback</button>
    </div>
  );
}
