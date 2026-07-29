import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
const router = Router();
// ==================== TABLE INITIALIZATION ====================
// Ensure product_fields table exists with camelCase columns
const initProductFieldsTable = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS product_fields (
      id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "productId" VARCHAR(255) NOT NULL,
      "fieldName" VARCHAR(100) NOT NULL,
      "fieldLabel" VARCHAR(100) NOT NULL,
      "fieldType" VARCHAR(50) DEFAULT 'text',
      "isRequired" BOOLEAN DEFAULT FALSE,
      options JSONB DEFAULT '[]',
      "displayOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("productId", "fieldName")
    )
  `);
};
// ==================== PRODUCT CRUD ====================
// Get all active products
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id, 
        name, 
        code, 
        description, 
        category, 
        "isActive", 
        "requiresApproval", 
        "approvalFlow", 
        "createdAt"
      FROM products 
      WHERE "isActive" = true 
      ORDER BY name ASC
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch products:', error);
        res.json([]);
    }
});
// Get available products for purchase
router.get('/available', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT id, name, code, description, "isActive"
      FROM products 
      WHERE "isActive" = true 
      ORDER BY name ASC
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch available products:', error);
        res.json([]);
    }
});
// ✅ FIXED: Get product by ID (was using '$1' as string literal, now uses parameterized query)
// Also supports product code lookup as fallback
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if the parameter looks like a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let productResult;
        if (isUUID) {
            // Fetch by ID
            productResult = await pool.query(`SELECT * FROM products WHERE id = $1`, [id]);
        }
        else {
            // Fetch by product code (case-insensitive)
            productResult = await pool.query(`SELECT * FROM products WHERE UPPER(code) = UPPER($1) OR UPPER(name) = UPPER($1)`, [id]);
        }
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = productResult.rows[0];
        // Fetch custom fields for this product
        await initProductFieldsTable();
        const fieldsResult = await pool.query(`SELECT 
        "fieldName" as name,
        "fieldLabel" as label,
        "fieldType" as type,
        "isRequired" as required,
        options,
        "displayOrder"
       FROM product_fields 
       WHERE "productId" = $1 
       ORDER BY "displayOrder" ASC`, [product.id]);
        // Format fields to match frontend CustomField interface
        const customFields = fieldsResult.rows.map((field) => ({
            name: field.name,
            label: field.label,
            type: field.type || 'text',
            required: field.required || false,
            options: field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : [],
        }));
        res.json({
            ...product,
            customFields,
        });
    }
    catch (error) {
        console.error('Failed to fetch product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});
// Get product by code (dedicated endpoint)
router.get('/code/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const productResult = await pool.query(`SELECT * FROM products WHERE UPPER(code) = UPPER($1)`, [code]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = productResult.rows[0];
        // Fetch custom fields
        await initProductFieldsTable();
        const fieldsResult = await pool.query(`SELECT 
        "fieldName" as name,
        "fieldLabel" as label,
        "fieldType" as type,
        "isRequired" as required,
        options,
        "displayOrder"
       FROM product_fields 
       WHERE "productId" = $1 
       ORDER BY "displayOrder" ASC`, [product.id]);
        const customFields = fieldsResult.rows.map((field) => ({
            name: field.name,
            label: field.label,
            type: field.type || 'text',
            required: field.required || false,
            options: field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : [],
        }));
        res.json({
            ...product,
            customFields,
        });
    }
    catch (error) {
        console.error('Failed to fetch product by code:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});
// Create product (admin only)
router.post('/', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const { name, code, description, category, isActive, requiresApproval, approvalFlow } = req.body;
        // Check if product with same code exists
        const existing = await pool.query('SELECT id FROM products WHERE code = $1', [code.toUpperCase()]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Product with this code already exists' });
        }
        const result = await pool.query(`
      INSERT INTO products (
        id, name, code, description, category, 
        "isActive", "requiresApproval", "approvalFlow", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING *
    `, [
            name,
            code.toUpperCase(),
            description,
            category || null,
            isActive !== undefined ? isActive : true,
            requiresApproval || false,
            approvalFlow || null
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to create product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});
// Update product
router.put('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const { name, description, category, isActive, requiresApproval, approvalFlow } = req.body;
        const result = await pool.query(`
      UPDATE products 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          "isActive" = COALESCE($4, "isActive"),
          "requiresApproval" = COALESCE($5, "requiresApproval"),
          "approvalFlow" = COALESCE($6, "approvalFlow"),
          "updatedAt" = NOW()
      WHERE id = $7
      RETURNING *
    `, [name, description, category, isActive, requiresApproval, approvalFlow, req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to update product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});
// Delete product
router.delete('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Also delete associated product fields
        await pool.query('DELETE FROM product_fields WHERE "productId" = $1', [req.params.id]);
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
// ==================== PRODUCT FIELDS ====================
// Get product fields - No authentication required for customers
router.get('/:productId/fields', async (req, res) => {
    try {
        await initProductFieldsTable();
        const result = await pool.query(`
      SELECT 
        "fieldName" as name,
        "fieldLabel" as label,
        "fieldType" as type,
        "isRequired" as required,
        options,
        "displayOrder",
        "placeholder"
      FROM product_fields 
      WHERE "productId" = $1 
      ORDER BY "displayOrder" ASC, "createdAt" ASC
    `, [req.params.productId]);
        // Format options
        const fields = result.rows.map((field) => ({
            name: field.name,
            label: field.label,
            type: field.type || 'text',
            required: field.required || false,
            options: field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : [],
            placeholder: field.placeholder || '',
        }));
        res.json(fields);
    }
    catch (error) {
        console.error('Failed to fetch product fields:', error);
        res.json([]);
    }
});
// Create product field (admin only)
router.post('/:productId/fields', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        await initProductFieldsTable();
        const { fieldName, fieldLabel, fieldType, isRequired, options, displayOrder } = req.body;
        const productId = req.params.productId;
        // Check if product exists
        const productExists = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
        if (productExists.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Check if field with same name already exists
        const existingField = await pool.query('SELECT id FROM product_fields WHERE "productId" = $1 AND "fieldName" = $2', [productId, fieldName]);
        if (existingField.rows.length > 0) {
            return res.status(400).json({ error: 'Field with this name already exists for this product' });
        }
        const result = await pool.query(`
      INSERT INTO product_fields (
        id, "productId", "fieldName", "fieldLabel", "fieldType", 
        "isRequired", options, "displayOrder", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING *
    `, [
            productId,
            fieldName,
            fieldLabel,
            fieldType || 'text',
            isRequired || false,
            JSON.stringify(options || []),
            displayOrder || 0
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to create product field:', error);
        res.status(500).json({ error: 'Failed to create product field', details: error.message });
    }
});
// Update product field
router.put('/:productId/fields/:fieldId', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        await initProductFieldsTable();
        const { fieldName, fieldLabel, fieldType, isRequired, options, displayOrder } = req.body;
        const result = await pool.query(`
      UPDATE product_fields 
      SET "fieldName" = COALESCE($1, "fieldName"),
          "fieldLabel" = COALESCE($2, "fieldLabel"),
          "fieldType" = COALESCE($3, "fieldType"),
          "isRequired" = COALESCE($4, "isRequired"),
          options = COALESCE($5, options),
          "displayOrder" = COALESCE($6, "displayOrder"),
          "updatedAt" = NOW()
      WHERE id = $7 AND "productId" = $8
      RETURNING *
    `, [
            fieldName,
            fieldLabel,
            fieldType,
            isRequired,
            options ? JSON.stringify(options) : null,
            displayOrder,
            req.params.fieldId,
            req.params.productId
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product field not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to update product field:', error);
        res.status(500).json({ error: 'Failed to update product field' });
    }
});
// Delete product field
router.delete('/:productId/fields/:fieldId', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        await initProductFieldsTable();
        const result = await pool.query('DELETE FROM product_fields WHERE id = $1 AND "productId" = $2 RETURNING id', [req.params.fieldId, req.params.productId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product field not found' });
        }
        res.json({ message: 'Field deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete product field:', error);
        res.status(500).json({ error: 'Failed to delete product field' });
    }
});
// ==================== SEED PRODUCTS ====================
router.post('/seed', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const products = [
            { name: 'Auto Insurance', code: 'AUTO', description: 'Comprehensive coverage for your vehicle', category: 'MOTOR' },
            { name: 'Home Insurance', code: 'HOME', description: 'Protection for your property and belongings', category: 'PROPERTY' },
            { name: 'Life Insurance', code: 'LIFE', description: 'Financial security for your loved ones', category: 'LIFE' },
            { name: 'Health Insurance', code: 'HEALTH', description: 'Medical coverage for you and your family', category: 'HEALTH' },
            { name: 'Travel Insurance', code: 'TRAVEL', description: 'Coverage for trip cancellation and medical abroad', category: 'TRAVEL' },
            { name: 'Business Insurance', code: 'BUSINESS', description: 'Commercial property and liability coverage', category: 'COMMERCIAL' }
        ];
        let inserted = 0;
        for (const product of products) {
            const existing = await pool.query('SELECT id FROM products WHERE code = $1', [product.code]);
            if (existing.rows.length === 0) {
                await pool.query(`
          INSERT INTO products (id, name, code, description, category, "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
        `, [product.name, product.code, product.description, product.category]);
                inserted++;
            }
        }
        res.json({ message: `Products seeded successfully`, inserted, total: products.length });
    }
    catch (error) {
        console.error('Failed to seed products:', error);
        res.status(500).json({ error: 'Failed to seed products' });
    }
});
export default router;
