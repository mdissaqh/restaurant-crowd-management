import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import axios from 'axios';

// all axios → /api
axios.defaults.baseURL = '/api';
const token = localStorage.getItem('token');
if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
