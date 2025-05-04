import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function EarningsPage() {
  const [orders, setOrders] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [weekTotal, setWeekTotal]   = useState(0);

  useEffect(() => {
    axios.get('http://localhost:3001/api/orders')
         .then(r => {
           setOrders(r.data);
           const now = new Date(), startToday = new Date(now.getFullYear(),now.getMonth(),now.getDate());
           const weekAgo = new Date(now.getTime() - 7*24*60*60*1000);
           setTodayTotal(r.data.filter(o => new Date(o.createdAt) >= startToday).reduce((s,o) => s + o.total, 0));
           setWeekTotal(r.data.filter(o => new Date(o.createdAt) >= weekAgo).reduce((s,o) => s + o.total, 0));
         });
  }, []);

  return (
    <div>
      <h3>Earnings</h3>
      <p><strong>Today:</strong> ₹{todayTotal.toFixed(2)}</p>
      <p><strong>This Week:</strong> ₹{weekTotal.toFixed(2)}</p>
      {/* You can add date-range inputs here */}
    </div>
  );
}
