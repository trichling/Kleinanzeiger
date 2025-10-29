/**
 * Unit tests for category mapping functionality.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CategoryMapper } from '../src/content/categories.js';

describe('CategoryMapper', () => {
  let tempFile: string;
  const categoriesData = {
    categories: {
      Elektronik: {
        subcategories: ['Audio & HiFi', 'Computer & Zubehör'],
      },
      'Möbel & Wohnen': {
        subcategories: ['Wohnzimmer'],
      },
      Sonstiges: {
        subcategories: ['Verschiedenes'],
      },
    },
    keywords: {
      Elektronik: ['elektronik', 'laptop', 'computer', 'kopfhörer'],
      'Möbel & Wohnen': ['möbel', 'sofa', 'tisch'],
    },
  };

  beforeEach(async () => {
    // Create temporary file
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'categories-test-'));
    tempFile = path.join(tmpDir, 'categories.json');
    await fs.writeFile(tempFile, JSON.stringify(categoriesData, null, 2));
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.unlink(tempFile);
      await fs.rmdir(path.dirname(tempFile));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should initialize CategoryMapper', () => {
    const mapper = new CategoryMapper(tempFile);
    expect(mapper).toBeDefined();
  });

  it('should match keywords correctly', () => {
    const mapper = new CategoryMapper(tempFile);

    // Test with laptop keyword
    const [category1] = mapper.mapCategory('Gaming Laptop', 'Powerful laptop for gaming');
    expect(category1).toBe('Elektronik');

    // Test with sofa keyword
    const [category2] = mapper.mapCategory('Bequemes Sofa', 'Großes Sofa für Wohnzimmer');
    expect(category2).toBe('Möbel & Wohnen');
  });

  it('should fallback to Sonstiges category', () => {
    const mapper = new CategoryMapper(tempFile);

    const [category] = mapper.mapCategory('Random Thing', 'Something unusual');
    expect(category).toBe('Sonstiges');
  });

  it('should use detected category override', () => {
    const mapper = new CategoryMapper(tempFile);

    const [category] = mapper.mapCategory('Some product', 'Description', 'Elektronik');
    expect(category).toBe('Elektronik');
  });
});
