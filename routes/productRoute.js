import express from "express";
import { isAdmin, requireSignIn } from "../middleware/authMiddleware.js";
import {
  createProductController,
  deleteProductController,
  getProductController,
  getSingleProductController,
  updateProductController,
  searchController,
  relatedProductController,
  productCategoryController,
} from "../controller/productController.js";
import formidable from "express-formidable";

const router = express.Router();

router.post(
  "/create-product",
  requireSignIn,
  isAdmin,
  formidable(),
  createProductController
);
router.get("/get-products", getProductController);
router.get("/get-product/:slug", getSingleProductController);
router.delete("/delete-product/:pid", deleteProductController);
router.put(
  "/update-product/:pid",
  requireSignIn,
  isAdmin,
  formidable(),
  updateProductController
);

router.get("/search/:keyword", searchController);
router.get("/related-product/:pid/:cid", relatedProductController);
router.get("/product-category/:slug", productCategoryController);

export default router;
