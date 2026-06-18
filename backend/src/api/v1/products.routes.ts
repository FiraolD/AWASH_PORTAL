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
  } catch (error) {
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
  } catch (error) {
    console.error('Failed to fetch available products:', error);
    res.json([]);
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM products WHERE id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get product by code
router.get('/code/:code', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM products WHERE code = $1
    `, [req.params.code.toUpperCase()]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
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
        id, 
        name, 
        code, 
        description, 
        category, 
        "isActive", 
        "requiresApproval", 
        "approvalFlow", 
        "createdAt", 
        "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, 
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING *
    `, [name, code.toUpperCase(), description, category || null, isActive !== undefined ? isActive : true, requiresApproval || false, approvalFlow || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    console.error('Failed to delete product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ==================== PRODUCT FIELDS ====================

// Get product fields - Remove authentication for customers
router.get('/:productId/fields', async (req, res) => {
  try {
    await initProductFieldsTable();
    
    const result = await pool.query(`
      SELECT 
        id,
        "productId",
        "fieldName",
        "fieldLabel",
        "fieldType",
        "isRequired",
        options,
        "fieldCategory",
        "displayOrder",
        "placeholder",
        "createdAt",
        "updatedAt"
      FROM product_fields 
      WHERE "productId" = $1 
      ORDER BY "displayOrder" ASC, "createdAt" ASC
    `, [req.params.productId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch product fields:', error);
    res.json([]);
  }
});

// Create product field
router.post('/:productId/fields', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    await initProductFieldsTable();
    
    const { fieldName, fieldLabel, fieldType, isRequired, options, displayOrder } = req.body;
    const productId = req.params.productId;
    
    console.log('Creating product field:', { productId, fieldName, fieldLabel, fieldType });
    
    // Check if product exists
    const productExists = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (productExists.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if field with same name already exists
    const existingField = await pool.query(
      'SELECT id FROM product_fields WHERE "productId" = $1 AND "fieldName" = $2',
      [productId, fieldName]
    );
    
    if (existingField.rows.length > 0) {
      return res.status(400).json({ error: 'Field with this name already exists for this product' });
    }
    
    const result = await pool.query(`
      INSERT INTO product_fields (
        id, 
        "productId", 
        "fieldName", 
        "fieldLabel", 
        "fieldType", 
        "isRequired", 
        options, 
        "displayOrder", 
        "createdAt", 
        "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING *
    `, [productId, fieldName, fieldLabel, fieldType || 'text', isRequired || false, JSON.stringify(options || []), displayOrder || 0]);
    
    console.log('Product field created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
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
    `, [fieldName, fieldLabel, fieldType, isRequired, JSON.stringify(options || []), displayOrder, req.params.fieldId, req.params.productId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product field not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update product field:', error);
    res.status(500).json({ error: 'Failed to update product field' });
  }
});

// Delete product field
router.delete('/:productId/fields/:fieldId', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    await initProductFieldsTable();
    
    const result = await pool.query(
      'DELETE FROM product_fields WHERE id = $1 AND "productId" = $2 RETURNING id',
      [req.params.fieldId, req.params.productId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product field not found' });
    }
    
    res.json({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error('Failed to delete product field:', error);
    res.status(500).json({ error: 'Failed to delete product field' });
  }
});

// Get product configuration
router.get('/:productId/config', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get product to find its category
    const productResult = await pool.query(
      'SELECT code, "productCategory" FROM products WHERE id = $1',
      [productId]
    );
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = productResult.rows[0];
    const category = product.productCategory || 'GENERAL';
    
    // Get template for this category
    const templateResult = await pool.query(`
      SELECT * FROM product_config_templates 
      WHERE "productCategory" = $1 AND "isActive" = true
    `, [category]);
    
    if (templateResult.rows.length > 0) {
      res.json(templateResult.rows[0]);
    } else {
      // Return default config
      res.json({
        templateName: 'General Insurance',
        productCategory: 'GENERAL',
        itemLabel: 'Item',
        itemsLabel: 'Items',
        allowMultipleItems: true,
        minItems: 1,
        maxItems: 10
      });
    }
  } catch (error) {
    console.error('Failed to fetch product config:', error);
    res.status(500).json({ error: 'Failed to fetch product configuration' });
  }
});


// Debug endpoint - check field categories
router.get('/debug/fields/:productCode', async (req, res) => {
  try {
    const { productCode } = req.params;
    const result = await pool.query(`
      SELECT 
        pf."fieldName",
        pf."fieldLabel", 
        pf."fieldCategory",
        p.code
      FROM product_fields pf
      JOIN products p ON p.id = pf."productId"
      WHERE p.code = $1
    `, [productCode.toUpperCase()]);
    
    res.json({
      productCode,
      fields: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
          INSERT INTO products (
            id, name, code, description, category, "isActive", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid()::text, $1, $2, $3, $4, true, NOW(), NOW()
          )
        `, [product.name, product.code, product.description, product.category]);
        inserted++;
      }
    }
    
    res.json({ message: `Products seeded successfully`, inserted, total: products.length });
  } catch (error) {
    console.error('Failed to seed products:', error);
    res.status(500).json({ error: 'Failed to seed products' });
  }
});

export default router;