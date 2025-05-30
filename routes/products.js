const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { Category } = require('../models/Category');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const {auth,adminAuth } = require('../middleware/auth');
const fs = require('fs').promises;
const Order = require('../models/Order');

// Get all products with filtering, sorting, and pagination
router.get('/', async (req, res) => {
    try {
        const { 
            category, 
            subcategory, 
            minPrice, 
            maxPrice, 
            rating,
            sort = '-createdAt',
            page = 1,
            limit = 10,
            search
        } = req.query;

        const query = {};
        
        if (category) query.category = category;
        if (subcategory) query.subcategory = subcategory;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = minPrice;
            if (maxPrice) query.price.$lte = maxPrice;
        }
        if (rating) query.rating = { $gte: rating };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const products = await Product.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('category', 'name')
            .populate('subcategory', 'name');

        const total = await Product.countDocuments(query);

        res.json({
            products,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name')
            .populate('subcategory', 'name')
            .populate('reviews.user', 'name');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create product
router.post('/', auth, adminAuth ,upload.array('images', 5), async (req, res) => {
    try {
        console.log('=== Product Creation Start ===');
        console.log('Raw request body:', req.body);
        console.log('Files:', req.files);
        console.log('User:', {
            _id: req.user._id,
            email: req.user.email,
            name: req.user.name
        });

        const { name, description, price, category, subcategory, stock } = req.body;

        // Validate required fields with specific error messages
        const errors = [];
        if (!name) errors.push('Name is required');
        if (!description) errors.push('Description is required');
        if (!price) errors.push('Price is required');
        if (!category) errors.push('Category is required');
        if (!req.user?._id) errors.push('User ID is required');

        const productPrice = Number(price);
        if (isNaN(productPrice)) errors.push('Invalid price format');
        
        const productStock = Number(stock);
        if (isNaN(productStock)) errors.push('Invalid stock format');

        if (errors.length > 0) {
            console.log('Validation errors:', errors);
            return res.status(400).json({ 
                message: 'Validation failed',
                errors: errors 
            });
        }

        // Check if category exists
        try {
            console.log('Checking category:', category);
            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                console.log('Category not found:', category);
                return res.status(400).json({ message: 'Invalid category ID' });
            }
            console.log('Category found:', categoryExists.name);
        } catch (categoryError) {
            console.error('Error checking category:', categoryError);
            return res.status(400).json({ message: 'Invalid category ID format' });
        }

        let images = [];
        
        // Upload images to Cloudinary if files are provided
        if (req.files && req.files.length > 0) {
            try {
                console.log('Uploading images to Cloudinary...');
                const uploadPromises = req.files.map(file => {
                    return new Promise((resolve, reject) => {
                        const timestamp = Math.round(new Date().getTime() / 1000);
                        cloudinary.uploader.upload(file.path, {
                            folder: 'products',
                            timestamp: timestamp
                        }, (error, result) => {
                            // Delete temporary file regardless of upload success
                            fs.unlink(file.path, (unlinkError) => {
                                if (unlinkError) console.error('Error deleting temp file:', unlinkError);
                            });

                            if (error) {
                                console.error('Cloudinary upload error:', error);
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        });
                    });
                });

                const uploadedImages = await Promise.all(uploadPromises);
                console.log('Images uploaded successfully:', uploadedImages.length);
                
                images = uploadedImages.map(img => ({
                    url: img.secure_url,
                    public_id: img.public_id
                }));
            } catch (uploadError) {
                console.error('Error uploading images:', uploadError);
                return res.status(500).json({ 
                    message: 'Failed to upload images', 
                    error: uploadError.message 
                });
            }
        }

        const productData = {
            name,
            description,
            price: productPrice,
            category,
            subcategory: subcategory || undefined,
            stock: productStock || 0,
            images,
            createdBy: req.user._id
        };

        console.log('Creating product with data:', productData);

        try {
            const product = new Product(productData);
            await product.save();
            
            // Populate category name for response
            await product.populate('category', 'name');
            if (subcategory) {
                await product.populate('subcategory', 'name');
            }

            console.log('Product created successfully:', product._id);
            res.status(201).json(product);
        } catch (saveError) {
            console.error('Error saving product:', saveError);
            if (saveError.name === 'ValidationError') {
                return res.status(400).json({ 
                    message: 'Validation error',
                    errors: Object.values(saveError.errors).map(err => err.message)
                });
            }
            throw saveError;
        }
    } catch (error) {
        console.error('Product creation error:', error);
        res.status(500).json({ 
            message: 'Failed to create product', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Update product
router.put('/:id', auth,adminAuth, upload.array('images', 5), async (req, res) => {
    try {
        const { name, description, price, category, subcategory, stock } = req.body;
        const productId = req.params.id;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Prepare update data
        const updateData = {
            name: name || product.name,
            description: description || product.description,
            price: price ? Number(price) : product.price,
            category: category || product.category,
            subcategory: subcategory || product.subcategory,
            stock: stock ? Number(stock) : product.stock
        };

        // Handle image uploads if any
        if (req.files && req.files.length > 0) {
            // Delete old images from Cloudinary
            const deletePromises = product.images.map(image => 
                cloudinary.uploader.destroy(image.public_id)
            );
            await Promise.all(deletePromises);

            // Upload new images
            const uploadPromises = req.files.map(file => {
                return new Promise((resolve, reject) => {
                    cloudinary.uploader.upload(file.path, {
                        folder: 'products',
                        timestamp: Math.round(new Date().getTime() / 1000)
                    }, (error, result) => {
                        fs.unlink(file.path).catch(err => console.error('Error deleting temp file:', err));
                        if (error) reject(error);
                        else resolve(result);
                    });
                });
            });

            const uploadedImages = await Promise.all(uploadPromises);
            updateData.images = uploadedImages.map(img => ({
                url: img.secure_url,
                public_id: img.public_id
            }));
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            updateData,
            { new: true }
        ).populate('category', 'name')
         .populate('subcategory', 'name');

        res.json(updatedProduct);
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ message: 'Failed to update product', error: error.message });
    }
});

// Delete product
router.delete('/:id', auth,adminAuth,async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Delete images from Cloudinary
        if (product.images && product.images.length > 0) {
            const deletePromises = product.images.map(image => 
                cloudinary.uploader.destroy(image.public_id)
            );
            await Promise.all(deletePromises);
        }

        // Delete the product
        await Product.findByIdAndDelete(productId);

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Failed to delete product', error: error.message });
    }
});

// Add a review
router.post('/:id/reviews', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        
        // Validate input
        if (!rating || !comment) {
            return res.status(400).json({ message: 'Rating and comment are required' });
        }

        const numRating = Number(rating);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user has already reviewed
        const alreadyReviewed = product.reviews.find(
            review => review.user.toString() === req.user._id.toString()
        );

        if (alreadyReviewed) {
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        // Add review
        const review = {
            rating: numRating,
            comment,
            user: req.user._id
        };

        product.reviews.push(review);
        product.numReviews = product.reviews.length;

        // Update product rating
        const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
        product.rating = totalRating / product.reviews.length;

        await product.save();
        await product.populate('reviews.user', 'name');

        res.status(201).json(review);
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ message: 'Failed to add review' });
    }
});

// Update a review
router.put('/:id/reviews/:reviewId', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        
        // Validate input
        if (!rating || !comment) {
            return res.status(400).json({ message: 'Rating and comment are required' });
        }

        const numRating = Number(rating);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Find the review
        const review = product.reviews.id(req.params.reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Update review
        review.rating = numRating;
        review.comment = comment;

        // Update product rating
        const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
        product.rating = totalRating / product.reviews.length;

        await product.save();
        await product.populate('reviews.user', 'name');

        res.json(review);
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ message: 'Failed to update review' });
    }
});
//checkout
router.post('/checkout', auth, async (req, res) => {
    try {
      const { products, totalAmount } = req.body;
  
      const newOrder = new Order({
        user: req.user._id,
        products,
        totalAmount,
      });
  
      await newOrder.save();
      res.status(201).json({ message: "Order placed successfully", order: newOrder });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "Failed to place order" });
    }
  });
// Delete a review
router.delete('/:id/reviews/:reviewId', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Find the review
        const reviewIndex = product.reviews.findIndex(review => review._id.toString() === req.params.reviewId);
        if (reviewIndex === -1) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Remove review
        product.reviews.splice(reviewIndex, 1);

        // Update product rating
        if (product.reviews.length > 0) {
            const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
            product.rating = totalRating / product.reviews.length;
        } else {
            product.rating = 0;
        }

        await product.save();
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ message: 'Failed to delete review' });
    }
});
router.get("/products", async (req, res) => {
    const { search } = req.query;
    let query = {};
  
    if (search) {
        query.name = { $regex: search, $options: "i" }; // Case-insensitive search
    }
  
    const products = await Product.find(query);
    res.json({ products });
  });
  

module.exports = router;
