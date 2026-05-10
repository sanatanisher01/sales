const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendPushNotification } = require('../utils/webpush');

// ─── helpers ────────────────────────────────────────────────────────────────

/** Save a notification record + optionally send Web Push to a user */
async function saveNotification(db, { recipientId, recipientRole, type, title, body, data = {} }) {
  const now = new Date();
  const notifId = uuidv4();

  await db.collection('notifications').doc(notifId).set({
    // ownerId used for owner notifications; salesmanId used for salesman notifications
    ownerId: recipientRole === 'owner' ? recipientId : (data.ownerId || null),
    salesmanId: recipientRole === 'salesman' ? recipientId : null,
    recipientId,
    recipientRole,
    type,
    title,
    body,
    read: false,
    createdAt: now,
    ...data,
  });

  // Send Web Push only if recipient has a subscription
  const subSnap = await db.collection('pushSubscriptions').doc(recipientId).get();
  if (subSnap.exists) {
    const { subscription } = subSnap.data();
    sendPushNotification(subscription, {
      title,
      body,
      icon: '/pwa-192x192.png',
      data: { type, url: recipientRole === 'owner' ? '/owner/orders' : '/salesman/orders', ...data },
    });
  }
}

// ─── routes ─────────────────────────────────────────────────────────────────

// GET /api/orders/export/csv — before /:id to avoid route conflict
router.get('/export/csv', authenticate, requireRole('owner'), async (req, res, next) => {
  try {
    const db = getDb();
    const { salesmanId, status, startDate, endDate } = req.query;

    const snapshot = await db.collection('orders').where('ownerId', '==', req.user.uid).get();
    let orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (salesmanId) orders = orders.filter((o) => o.salesmanId === salesmanId);
    if (status)     orders = orders.filter((o) => o.status === status);
    if (startDate)  orders = orders.filter((o) => o.createdAt.toDate() >= new Date(startDate));
    if (endDate) {
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
      orders = orders.filter((o) => o.createdAt.toDate() <= end);
    }
    orders.sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0));

    const header = 'Order ID,Salesman,Customer Name,Customer Phone,Total Value,Status,Date\n';
    const rows = orders.map((o) =>
      `"${o.id}","${o.salesmanName}","${o.customerName}","${o.customerPhone}","${o.totalValue}","${o.status}","${o.createdAt.toDate().toISOString()}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send(header + rows);
  } catch (err) { next(err); }
});

// POST /api/orders — salesman submits order → notify owner
router.post('/', authenticate, requireRole('salesman'), async (req, res, next) => {
  try {
    const { customerName, customerPhone, items, note } = req.body;

    const errors = {};
    if (!customerName || customerName.length < 1 || customerName.length > 100)
      errors.customerName = 'Customer name must be 1–100 characters';
    if (!customerPhone || !/^\d{7,15}$/.test(customerPhone))
      errors.customerPhone = 'Phone must be 7–15 digits';
    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.items = 'At least one line item is required';
    } else {
      items.forEach((item, i) => {
        if (!item.productName || item.productName.length < 1 || item.productName.length > 100)
          errors[`items[${i}].productName`] = 'Product name must be 1–100 characters';
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 9999)
          errors[`items[${i}].quantity`] = 'Quantity must be an integer 1–9999';
        if (typeof item.unitPrice !== 'number' || item.unitPrice < 0)
          errors[`items[${i}].unitPrice`] = 'Unit price must be a non-negative number';
      });
    }
    if (Object.keys(errors).length > 0) return res.status(400).json({ errors });

    const totalValue = Math.round(
      items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100
    ) / 100;

    const db = getDb();
    const orderId = uuidv4();
    const now = new Date();

    await db.collection('orders').doc(orderId).set({
      salesmanId: req.user.uid,
      salesmanName: req.user.name,
      ownerId: req.user.ownerId,
      customerName, customerPhone, items,
      note: note || '',
      totalValue,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    });

    // Notify owner — non-blocking
    saveNotification(db, {
      recipientId: req.user.ownerId,
      recipientRole: 'owner',
      type: 'new_order',
      title: `New order from ${req.user.name}`,
      body: `Customer: ${customerName} · ₹${totalValue.toFixed(2)}`,
      data: { orderId, salesmanId: req.user.uid, ownerId: req.user.ownerId },
    }).catch((e) => console.error('Notify owner error:', e));

    res.status(201).json({ message: 'Order submitted', orderId });
  } catch (err) { next(err); }
});

// GET /api/orders — owner or accountant
router.get('/', authenticate, requireRole('owner', 'accountant'), async (req, res, next) => {
  try {
    const db = getDb();
    const { salesmanId, status, startDate, endDate, page = 1 } = req.query;
    const pageSize = 50;

    const snapshot = await db.collection('orders').where('ownerId', '==', req.user.ownerId).get();
    let orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (salesmanId) orders = orders.filter((o) => o.salesmanId === salesmanId);
    if (status)     orders = orders.filter((o) => o.status === status);
    if (startDate)  orders = orders.filter((o) => o.createdAt.toDate() >= new Date(startDate));
    if (endDate) {
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
      orders = orders.filter((o) => o.createdAt.toDate() <= end);
    }
    orders.sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0));

    const total = orders.length;
    const startIdx = (parseInt(page) - 1) * pageSize;
    res.json({ orders: orders.slice(startIdx, startIdx + pageSize), total, page: parseInt(page), pageSize });
  } catch (err) { next(err); }
});

// GET /api/orders/:id
router.get('/:id', authenticate, requireRole('owner', 'accountant'), async (req, res, next) => {
  try {
    const db = getDb();
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists || doc.data().ownerId !== req.user.ownerId)
      return res.status(404).json({ error: 'Order not found' });
    res.json({ order: { id: doc.id, ...doc.data() } });
  } catch (err) { next(err); }
});

// PATCH /api/orders/:id/status — owner changes status → notify salesman
router.patch('/:id/status', authenticate, requireRole('owner'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });

    const db = getDb();
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists || doc.data().ownerId !== req.user.uid)
      return res.status(404).json({ error: 'Order not found' });

    const order = doc.data();
    await doc.ref.update({ status, updatedAt: new Date() });

    // Notify salesman — non-blocking
    const statusEmoji = { Confirmed: '✅', Delivered: '🚚', Cancelled: '❌', Pending: '⏳' };
    saveNotification(db, {
      recipientId: order.salesmanId,
      recipientRole: 'salesman',
      type: 'order_status',
      title: `Order ${status} ${statusEmoji[status] || ''}`,
      body: `Your order for ${order.customerName} has been marked ${status}`,
      data: { orderId: doc.id, ownerId: req.user.uid, status },
    }).catch((e) => console.error('Notify salesman error:', e));

    res.json({ message: 'Order status updated', status });
  } catch (err) { next(err); }
});

module.exports = router;
