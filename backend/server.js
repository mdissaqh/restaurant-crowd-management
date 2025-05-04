require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const path     = require('path');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const menuRoutes     = require('./routes/menu');
const orderRoutes    = require('./routes/order');
const authRoutes     = require('./routes/auth');
const settingsRoutes = require('./routes/settings');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.set('io', io);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(()=>console.log('MongoDB connected'))
.catch(err=>console.error('MongoDB error:', err));

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname,'uploads')));
app.use('/logo',    express.static(path.join(__dirname,'uploads','logo')));

app.use('/api/auth',     authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/menu',     menuRoutes);
app.use('/api/orders',   orderRoutes);  // <-- mount at /api/orders

io.on('connection', sock => console.log('Socket connected:', sock.id));

const PORT = process.env.PORT||3001;
server.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));