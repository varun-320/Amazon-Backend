const express = require('express');
const router = express.Router();
const { Category, Subcategory } = require('../models/Category');
const { auth, adminAuth } = require('../middleware/auth');

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().populate('parentCategory', 'name');
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single category by ID
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).populate('parentCategory', 'name');
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create category
router.post('/', auth, adminAuth, async (req, res) => {
    try {
        const { name, description, parentCategory } = req.body;
        const category = new Category({
            name,
            description,
            parentCategory: parentCategory || null
        });
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Category name already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Update category
router.put('/:id', auth, adminAuth, async (req, res) => {
    try {
        const { name, description, parentCategory } = req.body;
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            {
                name,
                description,
                parentCategory: parentCategory || null
            },
            { new: true }
        );
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Category name already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete category
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        // Remove this category as parent from any child categories
        await Category.updateMany(
            { parentCategory: req.params.id },
            { $unset: { parentCategory: "" } }
        );
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add subcategory to category
router.post('/:categoryId/subcategories', auth, adminAuth, async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await Category.findById(req.params.categoryId);
        
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        category.subcategories.push({ name, description });
        await category.save();
        
        res.status(201).json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
