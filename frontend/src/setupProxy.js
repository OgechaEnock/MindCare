const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxies API calls made during `npm start` to the Flask API.
// Only used for relative-path requests; axios calls that already set an
// absolute baseURL (see src/services/api.js) bypass this and are unaffected.
module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://localhost:4000',
      changeOrigin: true,
    })
  );
};
