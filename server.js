require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-this-to-a-long-random-secret';
const BKASH_NUMBER = process.env.BKASH_NUMBER || '01XXXXXXXXX';
const NAGAD_NUMBER = process.env.NAGAD_NUMBER || '01XXXXXXXXX';

const ORDERS_FILE = path.join(__dirname, 'orders.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers ----------
function readOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing admin key.' });
  }
  next();
}

function genOrderId() {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ZY-${stamp}-${rand}`;
}

// ---------- product catalog (edit this list to match your real products) ----------
const products = [
  { id: 1, cat: 'electronics', name: 'Zyntra AirBeat Wireless Earbuds', price: 49.99, glyph: '🎧' },
  { id: 2, cat: 'electronics', name: 'PulseFit Smart Fitness Band', price: 34.99, glyph: '⌚' },
  { id: 3, cat: 'fashion', name: 'Oversized Denim Jacket, Unisex', price: 58.00, glyph: '🧥' },
  { id: 4, cat: 'fashion', name: 'Classic Leather Sneakers', price: 72.00, glyph: '👟' },
  { id: 5, cat: 'home', name: '12-Piece Ceramic Cookware Set', price: 89.00, glyph: '🍳' },
  { id: 6, cat: 'home', name: 'Aroma Diffuser Lamp', price: 27.50, glyph: '🕯️' },
  { id: 7, cat: 'beauty', name: 'Vitamin C Brightening Serum Set', price: 22.00, glyph: '🧴' },
  { id: 8, cat: 'beauty', name: 'Electric Facial Cleansing Brush', price: 31.00, glyph: '🪥' },
  { id: 9, cat: 'sports', name: 'Foldable Non-Slip Yoga Mat', price: 19.99, glyph: '🧘' },
  { id: 10, cat: 'sports', name: 'Insulated Steel Water Bottle 1L', price: 16.50, glyph: '🚰' },
  { id: 11, cat: 'toys', name: '500-Piece Building Blocks Set', price: 24.99, glyph: '🧱' },
  { id: 12, cat: 'toys', name: 'Plush Bear Companion, 14 inch', price: 14.99, glyph: '🧸' },
  { id: 13, cat: 'grocery', name: 'Organic Trail Mix, 1kg Bag', price: 12.00, glyph: '🥜' },
  { id: 14, cat: 'grocery', name: 'Cold-Pressed Olive Oil, 500ml', price: 15.00, glyph: '🫒' },
  { id: 15, cat: 'books', name: 'Bestseller Fiction Bundle (3 books)', price: 28.00, glyph: '📖' },
  { id: 16, cat: 'books', name: 'Kids Picture Book Collection', price: 19.00, glyph: '📗' },
];

// ---------- public routes ----------
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.get('/api/payment-info', (req, res) => {
  res.json({ bkash: BKASH_NUMBER, nagad: NAGAD_NUMBER });
});

app.post('/api/orders', (req, res) => {
  const { customer, items, currency, paymentMethod, note } = req.body;

  if (!customer || !customer.name || !customer.phone || !customer.address) {
    return res.status(400).json({ error: 'Name, phone, and address are required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  const total = items.reduce((sum, i) => sum + (Number(i.price) * Number(i.qty)), 0);

  const order = {
    orderId: genOrderId(),
    createdAt: new Date().toISOString(),
    status: 'pending', // pending -> confirmed -> shipped -> delivered -> cancelled
    customer,
    items,
    currency: currency || 'USD',
    total: Math.round(total * 100) / 100,
    paymentMethod: paymentMethod || 'cod',
    note: note || '',
  };

  const orders = readOrders();
  orders.unshift(order);
  writeOrders(orders);

  res.status(201).json({
    message: 'Order received.',
    orderId: order.orderId,
    total: order.total,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    bkash: BKASH_NUMBER,
    nagad: NAGAD_NUMBER,
  });
});

// ---------- admin routes (require x-admin-key header) ----------
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  res.json(readOrders());
});

app.patch('/api/admin/orders/:orderId', requireAdmin, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }
  const orders = readOrders();
  const order = orders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  order.status = status;
  writeOrders(orders);
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`ZYNTRA store server running on port ${PORT}`);
});
