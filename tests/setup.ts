/**
 * Jest setup file for test environment configuration
 */

import 'jest-canvas-mock';

// Mock performance.now() for consistent timing in tests
if (typeof performance === 'undefined') {
  (global as any).performance = {
    now: () => Date.now()
  };
}
