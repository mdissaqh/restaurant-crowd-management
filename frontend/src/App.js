import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CustomerShop from './components/CustomerShop';
import CartPage from './components/CartPage';
import CustomerOrders from './components/CustomerOrders';
import Navbar from './components/Navbar';

export default function App() {
  const user = JSON.parse(localStorage.getItem('user'));
  const cart = JSON.parse(localStorage.getItem('cart') || '{}');

  return (
    <BrowserRouter>
      <Navbar cartCount={Object.values(cart).reduce((a, b) => a + b, 0)} />
      <Routes>
        <Route path="/shop" element={<CustomerShop />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/my-orders" element={<CustomerOrders />} />
        <Route path="/admin/*" element={<Navigate to="/admin/earnings" />} />
        <Route path="*" element={<Navigate to="/shop" />} />
      </Routes>
    </BrowserRouter>
  );
}
