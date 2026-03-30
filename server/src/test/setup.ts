import { vi } from 'vitest';

// We mock the database client globally so that real network calls are not made
vi.mock('../lib/insforge.js', () => ({
  getInsforgeClient: vi.fn(() => ({
    database: {
      from: vi.fn(),
    },
  })),
}));

// We can still optionally export setup functions here if needed.
