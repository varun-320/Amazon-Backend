require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB with retry logic
const connectWithRetry = async () => {
  try {
    // Check if MONGODB_URI is defined
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Attempting to connect to MongoDB...');
    console.log('Connection URI:', process.env.MONGODB_URI.replace(/:[^:@]*@/, ':****@')); // Hide password in logs
    
    // Test the connection with a timeout
    const connectionPromise = mongoose.connect(process.env.MONGODB_URI);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    );

    await Promise.race([connectionPromise, timeoutPromise]);
    console.log('Connected to MongoDB successfully');
    
    // Start the server only after successful database connection
    const startServer = (port) => {
      try {
        app.listen(port, () => {
          console.log(`Server is running on port ${port}`);
        }).on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}`);
            startServer(port + 1);
          } else {
            console.error('Error starting server:', err);
            process.exit(1);
          }
        });
      } catch (err) {
        console.error('Error starting server:', err);
        process.exit(1);
      }
    };

    startServer(process.env.PORT || 3000);
  } catch (err) {
    console.error('MongoDB connection error details:', {
      name: err.name,
      message: err.message,
      code: err.code,
      reason: err.reason?.message || 'No reason provided',
      stack: err.stack
    });
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

// Start the connection process
connectWithRetry();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api', require('./routes/api'));
app.use('/api/orders', require('./routes/orders'));

// Test route to verify MongoDB connection
app.get('/api/test', async (req, res) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState === 1) {
      res.json({ status: 'success', message: 'MongoDB is connected!' });
    } else {
      res.status(500).json({ status: 'error', message: 'MongoDB is not connected' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});
