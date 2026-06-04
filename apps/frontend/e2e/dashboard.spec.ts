import { test, expect } from '@playwright/test';

const API = 'http://localhost:4000';

const mockOrders = {
  data: [
    {
      id: 'order-1',
      status: 'CONFIRMED',
      total: 10800,
      currency: 'eur',
      createdAt: new Date().toISOString(),
      items: [{ product: { name: 'Stéthoscope Pro' }, quantity: 1 }],
      invoice: { id: 'inv-1', invoiceNumber: 'FA-2025-00001' },
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

const mockInvoices = {
  data: [
    {
      id: 'inv-1',
      invoiceNumber: 'FA-2025-00001',
      amount: 10800,
      status: 'PAID',
      createdAt: new Date().toISOString(),
      order: { id: 'order-1', user: { name: 'Test User', email: 'test@example.com' } },
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

test.describe('Dashboard — User Orders', () => {
  test.beforeEach(async ({ page }) => {
    // Simulate logged-in state
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
    });

    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
        }),
      });
    });

    await page.route(`${API}/orders/my*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOrders),
      });
    });

    await page.route(`${API}/invoices*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockInvoices),
      });
    });
  });

  test('dashboard orders page loads', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL(/dashboard\/orders/);
  });

  test('dashboard orders page renders without crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    expect(errors.filter((e) => !e.includes('hydrat') && !e.includes('chunk'))).toHaveLength(0);
  });
});

test.describe('Dashboard — Admin Invoices', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-admin-jwt-token');
    });

    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'admin-1',
          name: 'Admin',
          email: 'admin@example.com',
          role: 'ADMIN',
        }),
      });
    });

    await page.route(`${API}/invoices*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockInvoices),
      });
    });

    await page.route(`${API}/invoices/credit-notes*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });
  });

  test('admin invoices page loads', async ({ page }) => {
    await page.goto('/dashboard/admin/invoices');
    await expect(page).toHaveURL(/admin\/invoices/);
  });

  test('admin invoices page renders without crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/dashboard/admin/invoices');
    await page.waitForLoadState('networkidle');
    expect(errors.filter((e) => !e.includes('hydrat') && !e.includes('chunk'))).toHaveLength(0);
  });
});

test.describe('Dashboard — Admin Orders', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-admin-jwt-token');
    });

    await page.route(`${API}/auth/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'admin-1',
          name: 'Admin',
          email: 'admin@example.com',
          role: 'ADMIN',
        }),
      });
    });

    await page.route(`${API}/orders*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOrders),
      });
    });
  });

  test('admin orders page loads', async ({ page }) => {
    await page.goto('/dashboard/admin/orders');
    await expect(page).toHaveURL(/admin\/orders/);
  });
});
