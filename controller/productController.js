import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

import fs from "fs";
import slugify from "slugify";
import dotenv from "dotenv";

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

export const createProductController = async (req, res) => {
  try {
    console.log('=== CREATE PRODUCT DEBUG ===');
    console.log('req.fields:', req.fields);
    console.log('req.files:', req.files);

    const { name, description, price, category, quantity, bulkDiscounts, photo } = req.fields;

    console.log('Extracted photo field:', photo, 'type:', typeof photo);

    switch (true) {
      case !name:
        return res.status(500).send({ error: "Name is Required" });
      case !description:
        return res.status(500).send({ error: "Description is Required" });
      case !price:
        return res.status(500).send({ error: "Price is Required" });
      case !category:
        return res.status(500).send({ error: "Category is Required" });
      case !quantity:
        return res.status(500).send({ error: "Quantity is Required" });
    }

    const productFields = { ...req.fields, slug: slugify(name) };

    // Handle bulk discounts
    if (bulkDiscounts) {
      try {
        productFields.bulkDiscounts = JSON.parse(bulkDiscounts);
      } catch (e) {
        productFields.bulkDiscounts = [];
      }
    }

    // Handle photo - normalize to array of Cloudinary URLs
    const normalizedPhoto = normalizePhotoData(photo);
    console.log('Normalized photo:', normalizedPhoto);
    productFields.photo = normalizedPhoto;

    console.log('Final productFields:', productFields);

    const products = new productModel(productFields);
    await products.save();

    console.log('Saved product:', products);

    res.status(201).send({
      success: true,
      message: "Product Created Successfully",
      products,
    });
  } catch (error) {
    console.log('Create product error:', error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in creating product",
    });
  }
};

export const getProductController = async (req, res) => {
  try {
    const products = await productModel
      .find({})
      .populate("category")
      .limit(12)
      .sort({ createdAt: -1 });

    // Normalize photo data for all products
    const normalizedProducts = products.map(product => ({
      ...product.toObject(),
      photo: normalizePhotoData(product.photo)
    }));

    // Debug: Log photo data structure
    normalizedProducts.forEach((product, index) => {
      console.log(`Product ${index + 1} (${product.name}) photo type:`, typeof product.photo);
      console.log(`Product ${index + 1} photo value:`, product.photo);
    });

    res.status(200).send({
      success: true,
      counTotal: normalizedProducts.length,
      message: "ALL Products ",
      products: normalizedProducts,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Erorr in getting products",
      error: error.message,
    });
  }
};
// get single product
export const getSingleProductController = async (req, res) => {
  try {
    const product = await productModel
      .findOne({ slug: req.params.slug })
      .populate("category");

    // Normalize photo data
    const normalizedProduct = product ? {
      ...product.toObject(),
      photo: normalizePhotoData(product.photo)
    } : null;

    // Debug: Log photo data structure
    if (normalizedProduct) {
      console.log(`Single Product (${normalizedProduct.name}) photo type:`, typeof normalizedProduct.photo);
      console.log(`Single Product photo value:`, normalizedProduct.photo);
    }

    res.status(200).send({
      success: true,
      message: "Single Product Fetched",
      product: normalizedProduct,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Eror while getitng single product",
      error,
    });
  }
};

//get photo
export const productPhotoController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.pid).select("photo");
    if (product.photo.data) {
      res.set("Content-type", product.photo.contentType);
      return res.status(200).send(product.photo.data);
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Erorr while getting photo",
      error,
    });
  }
};

export const deleteProductController = async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.params.pid).select("-photo");
    res.status(200).send({
      success: true,
      message: "Product Deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while deleting product",
      error,
    });
  }
};

export const updateProductController = async (req, res) => {
  try {
    console.log('=== UPDATE PRODUCT DEBUG ===');
    console.log('req.fields:', req.fields);
    console.log('req.files:', req.files);

    const { name, description, price, photo, category, quantity, bulkDiscounts } = req.fields;

    console.log('Extracted photo field:', photo, 'type:', typeof photo);

    //Validation
    switch (true) {
      case !name:
        return res.status(500).send({ error: "Name is Required" });
      case !description:
        return res.status(500).send({ error: "Description is Required" });
      case !price:
        return res.status(500).send({ error: "Price is Required" });
      case !category:
        return res.status(500).send({ error: "Category is Required" });
      case !quantity:
        return res.status(500).send({ error: "Quantity is Required" });
    }

    const updateFields = { ...req.fields, slug: slugify(name) };

    // Handle bulk discounts
    if (bulkDiscounts) {
      try {
        updateFields.bulkDiscounts = JSON.parse(bulkDiscounts);
      } catch (e) {
        updateFields.bulkDiscounts = [];
      }
    }

    // Handle photo updates - normalize to array of Cloudinary URLs
    const normalizedPhoto = normalizePhotoData(photo);
    console.log('Normalized photo:', normalizedPhoto);
    updateFields.photo = normalizedPhoto;

    console.log('Final updateFields:', updateFields);

    const products = await productModel.findByIdAndUpdate(
      req.params.pid,
      updateFields,
      { new: true }
    );

    console.log('Updated product:', products);

    res.status(201).send({
      success: true,
      message: "Product Updated Successfully",
      products,
    });
  } catch (error) {
    console.log('Update product error:', error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in Update product",
    });
  }
};

export const searchController = async (req, res) => {
  try {
    let { keyword } = req.params;

    if (typeof keyword !== "string") {
      throw new Error("Keyword must be a string");
    }

    // Handle empty keyword
    if (!keyword.trim()) {
      throw new Error("Keyword cannot be empty");
    }

    const results = await productModel.find({
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ],
    });

    res.json(results);
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error In Search Product API",
      error,
    });
  }
};

export const relatedProductController = async (req, res) => {
  try {
    const { pid, cid } = req.params;
    const products = await productModel
      .find({
        category: cid,
        _id: { $ne: pid },
      })
      .select("-photo")
      .limit(3)
      .populate("category");

    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error In related Product API",
      error,
    });
  }
};

export const productCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });

    // Get all subcategories recursively
    const getAllSubcategories = async (parentId) => {
      const subcategories = await categoryModel.find({ parent: parentId });
      let allSubcategories = [...subcategories];

      for (const sub of subcategories) {
        const nestedSubs = await getAllSubcategories(sub._id);
        allSubcategories = [...allSubcategories, ...nestedSubs];
      }

      return allSubcategories;
    };

    // Get all subcategories for the current category
    const subcategories = await getAllSubcategories(category._id);

    // Create an array of all category IDs (current category + all subcategories)
    const categoryIds = [category._id, ...subcategories.map(sub => sub._id)];

    // Find products that belong to any of these categories
    const products = await productModel
      .find({
        category: { $in: categoryIds }
      })
      .populate("category");

    res.status(200).send({
      success: true,
      products,
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error In Product category API",
      error,
    });
  }
};
