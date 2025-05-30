const express = require('express');
const router = express.Router();
const productsRouter = require('./products');

// Mount the products router
router.use('/products', productsRouter);

// Example route
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Add your API routes here

module.exports = router;
