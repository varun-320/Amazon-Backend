const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: String,
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    subcategories: [subcategorySchema],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Category = mongoose.model('Category', categorySchema);
const Subcategory = mongoose.model('Subcategory', subcategorySchema);

module.exports = { Category, Subcategory };
