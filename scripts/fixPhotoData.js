import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import dotenv from 'dotenv';

dotenv.config();

// Utility function to normalize photo data
const normalizePhotoData = (photo) => {
    console.log('normalizePhotoData input:', photo, 'type:', typeof photo);

    if (!photo) return [];

    if (Array.isArray(photo)) {
        const result = photo.filter(url => url && typeof url === 'string' && url.trim());
        console.log('normalizePhotoData array result:', result);
        return result;
    }

    if (typeof photo === 'string') {
        // Handle JSON string arrays like '["url1", "url2"]'
        if (photo.startsWith('[') && photo.endsWith(']')) {
            try {
                const parsed = JSON.parse(photo);
                if (Array.isArray(parsed)) {
                    const result = parsed.filter(url => url && typeof url === 'string' && url.trim());
                    console.log('normalizePhotoData JSON array result:', result);
                    return result;
                }
            } catch (e) {
                console.log('Failed to parse JSON array:', e);
            }
        }

        // Handle comma-separated URLs
        if (photo.includes(',')) {
            const result = photo.split(',')
                .map(url => url.trim())
                .filter(url => url);
            console.log('normalizePhotoData comma-separated result:', result);
            return result;
        }

        // Single URL
        const result = [photo];
        console.log('normalizePhotoData single string result:', result);
        return result;
    }

    console.log('normalizePhotoData fallback result: []');
    return [];
};

const fixPhotoData = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        // Get all products
        const products = await productModel.find({});
        console.log(`Found ${products.length} products to check`);

        let fixedCount = 0;

        for (const product of products) {
            const originalPhoto = product.photo;
            const normalizedPhoto = normalizePhotoData(originalPhoto);

            // Check if normalization changed the data
            if (JSON.stringify(originalPhoto) !== JSON.stringify(normalizedPhoto)) {
                console.log(`Fixing product: ${product.name}`);
                console.log(`Original photo:`, originalPhoto);
                console.log(`Normalized photo:`, normalizedPhoto);

                // Update the product
                await productModel.findByIdAndUpdate(
                    product._id,
                    { photo: normalizedPhoto },
                    { new: true }
                );

                fixedCount++;
            }
        }

        console.log(`Fixed ${fixedCount} products`);
        console.log('Photo data migration completed successfully');

    } catch (error) {
        console.error('Error during photo data migration:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the migration
fixPhotoData();
