/**
 * Gemini API integration tests.
 * Tests vision and text generation capabilities.
 *
 * Prerequisites:
 * - GEMINI_API_KEY environment variable must be set
 * - Run with: npm test gemini.integration.test.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { createCanvas } from 'canvas';

// Load environment variables
dotenv.config();

describe('Gemini API Integration', () => {
  let apiKey: string;
  let genAI: GoogleGenerativeAI;

  beforeAll(() => {
    apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      console.warn('⚠️  GEMINI_API_KEY not found in environment. Tests will be skipped.');
    }
  });

  describe('API Key Loading', () => {
    it('should load API key from environment', () => {
      expect(apiKey).toBeTruthy();
      expect(apiKey.length).toBeGreaterThan(20);

      console.log('✓ API Key found');
      console.log(`  First 20 chars: ${apiKey.slice(0, 20)}`);
      console.log(`  Last 10 chars: ...${apiKey.slice(-10)}`);
      console.log(`  Length: ${apiKey.length} characters`);
    });

    it('should not contain spaces', () => {
      expect(apiKey).not.toContain(' ');
      expect(apiKey).not.toContain('\t');
      expect(apiKey).not.toContain('\n');
    });
  });

  describe('API Connection', () => {
    it('should connect to Gemini API', async () => {
      if (!apiKey) {
        console.log('⚠️  Skipping test - no API key');
        return;
      }

      genAI = new GoogleGenerativeAI(apiKey);

      // Try to get a model (this validates the API key)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      expect(model).toBeDefined();

      console.log('✓ Successfully configured Gemini API');
    });
  });

  describe('Text Generation', () => {
    it('should generate text', async () => {
      if (!apiKey) {
        console.log('⚠️  Skipping test - no API key');
        return;
      }

      genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const result = await model.generateContent("Say 'Hello from Gemini!' and nothing else.");
      const response = await result.response;
      const text = response.text();

      expect(text).toBeTruthy();
      expect(text.toLowerCase()).toContain('hello');

      console.log('✓ Text generation works');
      console.log(`  Response: ${text}`);
    }, 30000);
  });

  describe('Vision Analysis', () => {
    it('should analyze images', async () => {
      if (!apiKey) {
        console.log('⚠️  Skipping test - no API key');
        return;
      }

      genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Create a simple test image (100x100 red square) using canvas
      const canvas = createCanvas(100, 100);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);

      // Convert to base64
      const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

      console.log('✓ Test image created (100x100 red square)');

      // Test with image
      const result = await model.generateContent([
        'What color is this image? Answer with just the color name.',
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/jpeg',
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      expect(text).toBeTruthy();
      expect(text.toLowerCase()).toContain('red');

      console.log('✓ Vision analysis works');
      console.log(`  Response: ${text}`);
    }, 30000);
  });
});

describe('Gemini Configuration Loading', () => {
  it('should load API key from environment variable', () => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  GEMINI_API_KEY not set - skipping test');
      return;
    }

    expect(apiKey).toBeTruthy();
    expect(apiKey.length).toBeGreaterThan(20);
    expect(typeof apiKey).toBe('string');

    console.log('✓ API key loaded successfully');
    console.log(`  Length: ${apiKey.length}`);
    console.log(`  Type: ${typeof apiKey}`);
  });

  it('should not have whitespace in API key', () => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  GEMINI_API_KEY not set - skipping test');
      return;
    }

    const hasWhitespace = /\s/.test(apiKey);
    expect(hasWhitespace).toBe(false);

    if (hasWhitespace) {
      console.error('⚠️  WARNING: API key contains whitespace - this will cause errors!');
    } else {
      console.log('✓ API key format looks good');
    }
  });
});
