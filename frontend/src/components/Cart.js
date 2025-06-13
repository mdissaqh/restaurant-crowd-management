import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShoppingCart } from 'react-icons/fa';

export default function Cart({ cart, menu }) {
  const navigate = useNavigate();
  const items = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ ...menu.find(m => m._id === id), qty }));
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  if (items.length === 0) {
    return null; // Don't show empty cart
  }

  return (
    <div className="floating-cart">
      <button
        className="cart-button position-relative"
        onClick={() => navigate('/cart')}
      >
        <FaShoppingCart />
        <span className="cart-badge">
          {items.length}
        </span>
      </button>
      
      <div className="card cart-preview">
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0">Your Cart</h6>
        </div>
        <div className="card-body p-0">
          {items.length === 0 ? (
            <p className="text-center py-3 mb-0">Cart is empty</p>
          ) : (
            <>
              <ul className="list-group list-group-flush">
                {items.map(i => (
                  <li key={i._id} className="list-group-item d-flex justify-content-between py-2">
                    <div>
                      <span className="fw-bold">{i.name}</span>
                      <span className="text-muted ms-2">×{i.qty}</span>
                    </div>
                    <span>₹{(i.price * i.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="card-footer bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold">Total:</span>
                  <span className="fw-bold text-primary">₹{total.toFixed(2)}</span>
                </div>
                <button 
                  className="btn btn-primary w-100 mt-2"
                  onClick={() => navigate('/cart')}
                >
                  Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
