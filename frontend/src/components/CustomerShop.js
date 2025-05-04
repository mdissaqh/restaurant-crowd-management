import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Cart from './Cart';

export default function CustomerShop() {
  const [menu, setMenu]             = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart]             = useState(() => JSON.parse(localStorage.getItem('cart')||'{}'));

  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:3001/api/menu')
      .then(res => {
        setMenu(res.data);
        setCategories(Array.from(new Set(res.data.map(item => item.category))));
      })
      .catch(console.error);
  }, []);

  const inc = id => {
    const updated = { ...cart, [id]: (cart[id] || 0) + 1 };
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };
  const dec = id => {
    const updated = { ...cart, [id]: Math.max((cart[id] || 0) - 1, 0) };
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const filteredMenu = menu.filter(item =>
    (selectedCat === 'All' || item.category === selectedCat) &&
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showAll = selectedCat === 'All';
  const catsToRender = showAll
    ? categories
    : categories.includes(selectedCat)
      ? [selectedCat]
      : [];

  return (
    <div className="container py-4 position-relative">
      <Cart cart={cart} menu={menu} />
      <h2>Welcome, {user.name}</h2>

      <div className="mb-3">
        <label htmlFor="categorySelect" className="form-label">Select Category:</label>
        <input
          id="categorySelect"
          className="form-control mb-2"
          placeholder="All or type to search..."
          list="categoryList"
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
        />
        <datalist id="categoryList">
          <option value="All" />
          {categories.map(cat => <option key={cat} value={cat} />)}
        </datalist>

        <div className="d-flex flex-wrap gap-2 mt-2">
          <button
            className={`btn btn-sm ${selectedCat === 'All' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setSelectedCat('All')}
          >All</button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${selectedCat === cat ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setSelectedCat(cat)}
            >{cat}</button>
          ))}
        </div>

        {/* Search bar */}
        <input
          type="text"
          className="form-control mt-2"
          placeholder="Search items..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {catsToRender.map(cat => {
        const items = filteredMenu.filter(item => item.category === cat);
        return (
          <div key={cat} className="mb-5">
            <h3>{cat}</h3>
            <div className="row">
              {items.map(item => (
                <div key={item._id} className="col-md-3 mb-3">
                  <div className="card h-100">
                    {item.image && (
                      <img
                        src={`http://localhost:3001${item.image}`}
                        className="card-img-top"
                        alt={item.name}
                      />
                    )}
                    <div className="card-body d-flex flex-column">
                      <h5 className="card-title">{item.name}</h5>
                      <p className="card-text">₹{item.price.toFixed(2)}</p>
                      <div className="mt-auto d-flex align-items-center">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => dec(item._id)}>–</button>
                        <span className="mx-2">{cart[item._id] || 0}</span>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => inc(item._id)}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="col-12">
                  <p className="text-muted">No items in this category.</p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button
        className="btn btn-success mt-4"
        onClick={() => navigate('/cart')}
        disabled={!Object.values(cart).some(q => q > 0)}
      >Go to Cart</button>
    </div>
  );
}
