import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShoppingCart } from 'react-icons/fa';

export default function Cart({ cart, menu }) {
  const navigate = useNavigate();
  const items = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ ...menu.find(m => m._id === id), qty }));
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="position-fixed top-50 end-0 translate-middle-y p-3" style={{ zIndex: 1000 }}>
      <button
        className="btn btn-danger rounded-circle position-relative"
        style={{ width: 60, height: 60 }}
        onClick={() => navigate('/cart')}
      >
        <FaShoppingCart size={24} />
        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning">
          {items.length}
        </span>
      </button>
      <div className="card mt-2" style={{ width: 250 }}>
        <div className="card-body p-2">
          {items.length === 0 ? (
            <p className="text-center mb-0">Cart is empty</p>
          ) : (
            <>
              {items.map(i => (
                <div key={i._id} className="d-flex justify-content-between small">
                  <span>{i.name}×{i.qty}</span>
                  <span>₹{i.price * i.qty}</span>
                </div>
              ))}
              <hr className="my-2" />
              <div className="d-flex justify-content-between fw-bold small">
                <span>Total:</span><span>₹{total.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
