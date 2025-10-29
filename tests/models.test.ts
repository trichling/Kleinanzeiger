/**
 * Unit tests for data models.
 */

import {
  ProductInfoSchema,
  AdContentSchema,
  BrowserConfigSchema,
  DelaysConfigSchema,
} from '../src/vision/models.js';

describe('ProductInfo Model', () => {
  it('should create ProductInfo successfully', () => {
    const product = ProductInfoSchema.parse({
      name: 'Test Laptop',
      description: 'A great laptop',
      condition: 'Gebraucht',
      suggestedPrice: 500.0,
    });

    expect(product.name).toBe('Test Laptop');
    expect(product.description).toBe('A great laptop');
    expect(product.suggestedPrice).toBe(500.0);
  });

  it('should reject negative prices', () => {
    expect(() => {
      ProductInfoSchema.parse({
        name: 'Test',
        description: 'Test',
        condition: 'Gebraucht',
        suggestedPrice: -10.0,
      });
    }).toThrow();
  });

  it('should use default values', () => {
    const product = ProductInfoSchema.parse({
      name: 'Test',
      description: 'Test',
    });

    expect(product.condition).toBe('Gebraucht');
    expect(product.imagePaths).toEqual([]);
    expect(product.features).toEqual([]);
  });
});

describe('AdContent Model', () => {
  it('should create AdContent successfully', () => {
    const ad = AdContentSchema.parse({
      title: 'Gaming Laptop',
      description: 'Powerful gaming laptop',
      price: 600.0,
      category: 'Elektronik',
      postalCode: '10115',
      condition: 'Gebraucht',
      shipping: 'Versand möglich',
    });

    expect(ad.title).toBe('Gaming Laptop');
    expect(ad.price).toBe(600.0);
    expect(ad.postalCode).toBe('10115');
  });

  it('should reject title exceeding max length', () => {
    expect(() => {
      AdContentSchema.parse({
        title: 'A'.repeat(70), // Too long
        description: 'Test',
        price: 100.0,
        category: 'Test',
        postalCode: '12345',
        condition: 'Gebraucht',
        shipping: 'Versand möglich',
      });
    }).toThrow();
  });

  it('should validate postal code format', () => {
    // Invalid: not 5 digits
    expect(() => {
      AdContentSchema.parse({
        title: 'Test',
        description: 'Test',
        price: 100.0,
        category: 'Test',
        postalCode: '123', // Too short
        condition: 'Gebraucht',
        shipping: 'Versand möglich',
      });
    }).toThrow();

    // Invalid: contains letters
    expect(() => {
      AdContentSchema.parse({
        title: 'Test',
        description: 'Test',
        price: 100.0,
        category: 'Test',
        postalCode: '1234A', // Contains letter
        condition: 'Gebraucht',
        shipping: 'Versand möglich',
      });
    }).toThrow();
  });

  it('should accept valid postal code', () => {
    const ad = AdContentSchema.parse({
      title: 'Test',
      description: 'Test',
      price: 100.0,
      category: 'Test',
      postalCode: '12345',
      condition: 'Gebraucht',
      shipping: 'Versand möglich',
    });

    expect(ad.postalCode).toBe('12345');
  });
});

describe('BrowserConfig Model', () => {
  it('should use default values', () => {
    const config = BrowserConfigSchema.parse({});

    expect(config.cdpUrl).toBe('http://localhost:9222');
    expect(config.headless).toBe(false);
    expect(config.timeout).toBe(30000);
    expect(config.screenshotOnError).toBe(true);
  });

  it('should allow custom values', () => {
    const config = BrowserConfigSchema.parse({
      cdpUrl: 'http://localhost:9223',
      headless: true,
      timeout: 60000,
      screenshotOnError: false,
    });

    expect(config.cdpUrl).toBe('http://localhost:9223');
    expect(config.headless).toBe(true);
    expect(config.timeout).toBe(60000);
    expect(config.screenshotOnError).toBe(false);
  });
});

describe('DelaysConfig Model', () => {
  it('should use default delay values', () => {
    const config = DelaysConfigSchema.parse({});

    expect(config.typing.min).toBe(30);
    expect(config.typing.max).toBe(150);
    expect(config.click.min).toBe(100);
    expect(config.click.max).toBe(300);
    expect(config.pageLoad).toBe(2000);
  });

  it('should allow custom delay values', () => {
    const config = DelaysConfigSchema.parse({
      typing: { min: 50, max: 200 },
      click: { min: 150, max: 400 },
      pageLoad: 3000,
    });

    expect(config.typing.min).toBe(50);
    expect(config.typing.max).toBe(200);
    expect(config.click.min).toBe(150);
    expect(config.click.max).toBe(400);
    expect(config.pageLoad).toBe(3000);
  });
});
