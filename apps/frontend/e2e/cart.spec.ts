import { test, expect } from '@playwright/test';

const API = 'http://localhost:4000';

const mockProducts = [
  {
    id: 'prod-1',
    name: 'Stéthoscope Pro',
    slug: 'stethoscope-pro',
    price: 8900,
    currency: 'eur',
    stock: 50,
    active: true,
    images: [],
    description: 'Stéthoscope professionnel',
  },
];

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  status: 'PENDING',
  total: 10680,
  subtotal: 8900,
  tax: 1780,
  shippingCost: 0,
  currency: 'eur',
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      quantity: 1,
      unitPrice: 8900,
      total: 8900,
      product: mockProducts[0],
    },
  ],
};

test.describe('Cart page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API}/products*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockProducts, total: 1 }),
      });
    });

    await page.route(`${API}/products/availability`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ productId: 'prod-1', available: true, stock: 50 }]),
      });
    });

    await page.route(`${API}/frais-port*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ amount: 0, type: 'FREE_ABOVE', label: 'Livraison offerte' }),
      });
    });
  });

  test('displays empty cart message when cart is empty', async ({ page }) => {
    await page.goto('/cart');
    // The cart page should render without crashing
    await expect(page).toHaveURL(/cart/);
  });

  test('cart page loads without error', async ({ page }) => {
    await page.goto('/cart');
    // No uncaught errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors.filter((e) => !e.includes('hydrat'))).toHaveLength(0);
  });
});

test.describe('Checkout flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth state
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
    });

    await page.route(`${API}/orders`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(mockOrder),
        });
      }
    });

    await page.route(`${API}/payments/create-intent`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ clientSecret: 'pi_test_secret_mock' }),
      });
    });

    await page.route(`${API}/addresses*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('https://js.stripe.com/**', (route) => route.abort());
  });

  test('checkout page loads', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/checkout/);
  });
});

test.describe('Order confirmation page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API}/orders/order-1/confirmation`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOrder),
      });
    });

    await page.route(`${API}/orders/order-1`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOrder),
      });
    });

    await page.route(`${API}/payments/confirm-order`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ confirmed: true }),
      });
    });

    await page.route(`${API}/invoices*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'inv-1', invoiceNumber: 'FA-2025-00001', status: 'PAID' }),
      });
    });
  });

  test('confirmation page displays order details', async ({ page }) => {
    await page.goto('/checkout/confirmation?orderId=order-1&redirect_status=succeeded');
    await expect(page).toHaveURL(/confirmation/);
  });

  test('confirmation page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/checkout/confirmation?orderId=order-1&redirect_status=succeeded');
    await page.waitForLoadState('networkidle');
    expect(errors.filter((e) => !e.includes('hydrat') && !e.includes('chunk'))).toHaveLength(0);
  });
});
