import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { buildCheckoutCsv } from '../utils/csv.js';

const router = Router();

router.get('/checkouts.csv', requireAuth, requireAdmin, async (_req, res) => {
  const checkouts = await prisma.checkout.findMany({
    orderBy: { checkedOutAt: 'desc' },
    include: {
      image: true,
      book: true,
      admin: true
    }
  });

  const csv = buildCheckoutCsv(
    checkouts.map((checkout) => ({
      imageId: checkout.imageId,
      bookId: checkout.bookId,
      title: checkout.book.title,
      author: checkout.book.author,
      adminEmail: checkout.admin.email,
      checkedOutAt: checkout.checkedOutAt
    }))
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="checkouts.csv"');
  res.send(csv);
});

export default router;
