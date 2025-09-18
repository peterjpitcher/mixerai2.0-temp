import '@testing-library/jest-dom';

// Provide fetch/request polyfills for tests that rely on Next.js Request objects
const nodeFetch = require('node-fetch');
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = nodeFetch;
}
if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = nodeFetch.Request;
}
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = nodeFetch.Response;
}
if (typeof globalThis.Headers === 'undefined') {
  globalThis.Headers = nodeFetch.Headers;
}
