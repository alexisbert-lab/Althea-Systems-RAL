import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TableauDeBordService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprehensive dashboard KPIs for backoffice
   */
  async getKpis() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Paid statuses
    const paidStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

    const [
      revenueToday,
      revenueWeek,
      revenueMonth,
      ordersToday,
      ordersWeek,
      ordersMonth,
      ordersPending,
      totalOrders,
      totalProducts,
      totalUsers,
      stockAlerts,
      unreadMessages,
    ] = await Promise.all([
      // Revenue today
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: {
          createdAt: { gte: startOfToday },
          status: { in: [...paidStatuses] },
        },
      }),
      // Revenue this week
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: {
          createdAt: { gte: startOfWeek },
          status: { in: [...paidStatuses] },
        },
      }),
      // Revenue this month
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: {
          createdAt: { gte: startOfMonth },
          status: { in: [...paidStatuses] },
        },
      }),
      // Orders today
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      // Orders this week
      this.prisma.order.count({ where: { createdAt: { gte: startOfWeek } } }),
      // Orders this month
      this.prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      // Pending orders
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      // Total orders
      this.prisma.order.count(),
      // Total products
      this.prisma.product.count({ where: { active: true } }),
      // Total users
      this.prisma.user.count(),
      // Products with low stock (per-product threshold)
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM products
        WHERE active = true AND stock > 0 AND stock <= "lowStockThreshold"
      `.then(r => Number(r[0]?.count || 0)),
      // Unread contact messages
      this.prisma.contact.count({ where: { read: false } }),
    ]);

    return {
      revenue: {
        today: revenueToday._sum.total || 0,
        week: revenueWeek._sum.total || 0,
        month: revenueMonth._sum.total || 0,
      },
      orders: {
        today: ordersToday,
        week: ordersWeek,
        month: ordersMonth,
        pending: ordersPending,
        total: totalOrders,
      },
      products: {
        total: totalProducts,
        stockAlerts,
      },
      users: {
        total: totalUsers,
      },
      messages: {
        unread: unreadMessages,
      },
    };
  }

  /**
   * Sales breakdown by category for pie chart
   * @param days Number of days to look back (default 7)
   */
  async getSalesByCategory(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const paidStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

    // Raw query to group order items by category
    const result = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { total: true },
      where: {
        order: {
          createdAt: { gte: since },
          status: { in: paidStatuses as any },
        },
      },
    });

    // Get product → category mapping
    const productIds = result.map((r) => r.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true, category: { select: { name: true } } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Aggregate by category
    const categoryTotals = new Map<string, { name: string; total: number }>();
    for (const item of result) {
      const product = productMap.get(item.productId);
      const catName = product?.category?.name || 'Sans catégorie';
      const catId = product?.categoryId || 'uncategorized';
      const existing = categoryTotals.get(catId) || { name: catName, total: 0 };
      existing.total += item._sum.total || 0;
      categoryTotals.set(catId, existing);
    }

    return Array.from(categoryTotals.values())
      .sort((a, b) => b.total - a.total)
      .map((c) => ({
        category: c.name,
        revenue: c.total,
      }));
  }

  /**
   * Products with low stock details
   */
  async getStockAlerts(limit = 10) {
    return this.prisma.$queryRaw<
      { id: string; name: string; sku: string | null; stock: number; images: string[]; categoryName: string | null }[]
    >`
      SELECT p.id, p.name, p.sku, p.stock, p.images,
             c.name AS "categoryName"
      FROM products p
      LEFT JOIN categories c ON c.id = p."categoryId"
      WHERE p.active = true AND p.stock > 0 AND p.stock <= p."lowStockThreshold"
      ORDER BY p.stock ASC
      LIMIT ${limit}
    `.then(rows =>
      rows.map(r => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        stock: r.stock,
        images: r.images,
        category: r.categoryName ? { name: r.categoryName } : null,
      }))
    );
  }

  /**
   * Recent orders for the dashboard
   */
  async getRecentOrders(limit = 10) {
    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
        _count: { select: { items: true } },
      },
    });
  }

  /**
   * Multi-layer histogram: daily sales revenue broken down by category
   */
  async getSalesHistogram(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const paidStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: since },
          status: { in: paidStatuses as any },
        },
      },
      select: {
        total: true,
        order: { select: { createdAt: true } },
        product: { select: { category: { select: { name: true } } } },
      },
    });

    const dateMap = new Map<string, Map<string, number>>();
    const allCategories = new Set<string>();

    for (const item of items) {
      const dateKey = item.order.createdAt.toISOString().split('T')[0];
      const catName = item.product?.category?.name || 'Sans catégorie';
      allCategories.add(catName);
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, new Map());
      const catMap = dateMap.get(dateKey)!;
      catMap.set(catName, (catMap.get(catName) || 0) + (item.total || 0));
    }

    const result: Record<string, number | string>[] = [];
    for (let d = 0; d < days; d++) {
      const date = new Date(since);
      date.setDate(date.getDate() + d);
      const dateKey = date.toISOString().split('T')[0];
      const catMap = dateMap.get(dateKey) || new Map<string, number>();
      const entry: Record<string, number | string> = { date: dateKey };
      for (const cat of allCategories) {
        entry[cat] = catMap.get(cat) || 0;
      }
      result.push(entry);
    }

    return { data: result, categories: Array.from(allCategories) };
  }

  /**
   * Top selling products
   */
  async getTopProducts(limit = 5, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const paidStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

    const topItems = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, total: true },
      where: {
        order: {
          createdAt: { gte: since },
          status: { in: paidStatuses as any },
        },
      },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const productIds = topItems.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, images: true, price: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topItems.map((item) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        name: product?.name || 'Produit inconnu',
        image: product?.images?.[0] || null,
        price: product?.price || 0,
        quantitySold: item._sum.quantity || 0,
        revenue: item._sum.total || 0,
      };
    });
  }
}
