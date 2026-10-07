-- ==========================================
-- 11. SEED DATA
-- ==========================================

-- 11.1 Role Levels
INSERT INTO role_levels ("levelCode", "levelName", department, "levelOrder", "canApprove", "canReject", "maxAmountLimit")
VALUES
  ('UNDERWRITING_OFFICER_I', 'Underwriting Officer I', 'Underwriting', 1, FALSE, FALSE, 100000),
  ('UNDERWRITING_OFFICER_II', 'Underwriting Officer II', 'Underwriting', 2, TRUE, TRUE, 500000),
  ('SENIOR_UNDERWRITING_OFFICER', 'Senior Underwriting Officer', 'Underwriting', 3, TRUE, TRUE, 1000000),
  ('SUPERVISOR_UNDERWRITING', 'Supervisor Underwriting', 'Underwriting', 4, TRUE, TRUE, 2000000),
  ('MANAGER_UNDERWRITING', 'Manager Underwriting', 'Underwriting', 5, TRUE, TRUE, 5000000),
  ('HEAD_UNDERWRITING', 'Head of Underwriting', 'Underwriting', 6, TRUE, TRUE, NULL),
  ('CLAIMS_ADJUSTER', 'Claims Adjuster', 'Claims', 1, TRUE, TRUE, 500000),
  ('SENIOR_CLAIM_OFFICER', 'Senior Claim Officer', 'Claims', 2, TRUE, TRUE, 1000000),
  ('MANAGER_CLAIMS', 'Manager Claims', 'Claims', 3, TRUE, TRUE, 2000000),
  ('HEAD_CLAIMS', 'Head of Claims', 'Claims', 4, TRUE, TRUE, NULL)
ON CONFLICT ("levelCode") DO NOTHING;

-- 11.2 Products
INSERT INTO products (name, code, description, category, "isActive", "requiresApproval")
VALUES
  ('Comprehensive Motor Insurance', 'AUTO', 'Full coverage for private vehicles including third-party liability and theft', 'MOTOR', TRUE, TRUE),
  ('Home Protection Insurance', 'HOME', 'Coverage for property and belongings against fire, theft, and natural disasters', 'PROPERTY', TRUE, TRUE),
  ('Term Life Insurance', 'LIFE', 'Financial security for your family with fixed premium payments', 'LIFE', TRUE, TRUE),
  ('Health Plus Insurance', 'HEALTH', 'Extensive healthcare coverage including inpatient and outpatient services', 'HEALTH', TRUE, TRUE),
  ('Travel Insurance', 'TRAVEL', 'Coverage for trip cancellation, medical emergencies, and lost luggage', 'TRAVEL', TRUE, FALSE)
ON CONFLICT (code) DO NOTHING;

-- 11.3 Premium Rates
INSERT INTO premium_rates ("productId", "productType", "coverageTier", "baseRate", "minCoverage", "maxCoverage", "riskFactor")
SELECT 
  p.id,
  p.code,
  'Standard',
  0.035,
  100000,
  500000,
  1.0
FROM products p
WHERE p.code = 'AUTO'
ON CONFLICT DO NOTHING;

INSERT INTO premium_rates ("productId", "productType", "coverageTier", "baseRate", "minCoverage", "maxCoverage", "riskFactor")
SELECT 
  p.id,
  p.code,
  'Premium',
  0.030,
  500001,
  1000000,
  0.9
FROM products p
WHERE p.code = 'AUTO'
ON CONFLICT DO NOTHING;

INSERT INTO premium_rates ("productId", "productType", "coverageTier", "baseRate", "minCoverage", "maxCoverage", "riskFactor")
SELECT 
  p.id,
  p.code,
  'Standard',
  0.020,
  100000,
  NULL,
  1.0
FROM products p
WHERE p.code = 'HOME'
ON CONFLICT DO NOTHING;

-- 11.4 Perils for Motor Insurance
INSERT INTO perils ("productId", "perilName", description, "premiumRate", "calculationType", "isDefault", "displayOrder")
SELECT 
  p.id,
  'Collision Damage',
  'Coverage for damage to your vehicle from collision with another object',
  0.02,
  'PERCENTAGE',
  TRUE,
  1
FROM products p
WHERE p.code = 'AUTO'
ON CONFLICT DO NOTHING;

INSERT INTO perils ("productId", "perilName", description, "premiumRate", "calculationType", "isDefault", "displayOrder")
SELECT 
  p.id,
  'Theft Protection',
  'Coverage for theft of your vehicle or its contents',
  0.015,
  'PERCENTAGE',
  TRUE,
  2
FROM products p
WHERE p.code = 'AUTO'
ON CONFLICT DO NOTHING;

INSERT INTO perils ("productId", "perilName", description, "premiumRate", "calculationType", "isDefault", "displayOrder")
SELECT 
  p.id,
  'Third Party Liability',
  'Coverage for damage to third party property and injury to others',
  0.025,
  'PERCENTAGE',
  TRUE,
  3
FROM products p
WHERE p.code = 'AUTO'
ON CONFLICT DO NOTHING;

-- 11.5 Riders for Motor Insurance
INSERT INTO riders ("productId", "riderName", description, "premiumRate", "calculationType", "maxLimit")
SELECT 
  p.id,
  'Roadside Assistance',
  '24/7 roadside assistance including towing, fuel delivery, and tire change',
  500,
  'FIXED',
  5000
FROM products p
WHERE p.code = 'AUTO'
ON CONFLICT DO NOTHING;

INSERT INTO riders ("productId", "riderName", description, "premiumRate", "calculationType", "maxLimit")
SELECT 
  p.id,
  'Medical Payments',
  'Coverage for medical expenses resulting from an accident',
  0.005,
  'PERCENTAGE',
  100000
FROM products p
WHERE p.code = 'AUTO'
ON CONFLICT DO NOTHING;

-- 11.6 Approval Rules
INSERT INTO approval_rules (rule_name, product_type, min_sum_insured, max_sum_insured, approval_levels, is_active)
VALUES
  (
    'Low Value Auto Policies',
    'AUTO',
    0,
    250000,
    '["UNDERWRITING_OFFICER_I", "UNDERWRITING_OFFICER_II"]',
    TRUE
  ),
  (
    'Medium Value Auto Policies',
    'AUTO',
    250001,
    1000000,
    '["UNDERWRITING_OFFICER_II", "SENIOR_UNDERWRITING_OFFICER", "MANAGER_UNDERWRITING"]',
    TRUE
  ),
  (
    'High Value Auto Policies',
    'AUTO',
    1000001,
    NULL,
    '["SENIOR_UNDERWRITING_OFFICER", "MANAGER_UNDERWRITING", "HEAD_UNDERWRITING"]',
    TRUE
  )
ON CONFLICT DO NOTHING;

-- 11.7 System Settings
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES
  ('vatRate', '0.15', 'Value Added Tax rate'),
  ('drrRate', '0.01', 'Disability and Rehabilitation Rate'),
  ('companyName', '"Awash Insurance SC"', 'Company display name'),
  ('companyEmail', '"info@awashinsurance.com"', 'Company contact email'),
  ('supportEmail', '"support@awashinsurance.com"', 'Customer support email'),
  ('supportPhone', '"+251-11-551-0000"', 'Customer support phone'),
  ('currency', '"ETB"', 'System currency'),
  ('dateFormat', '"DD/MM/YYYY"', 'Date display format'),
  ('timezone', '"Africa/Addis_Ababa"', 'System timezone'),
  ('enableOnlinePayments', 'true', 'Enable online payment processing'),
  ('enableChatSupport', 'true', 'Enable live chat support')
ON CONFLICT (setting_key) DO NOTHING;

-- 11.8 Admin User (password: Password123!)
INSERT INTO users (email, "passwordHash", "firstName", "lastName", role, status)
VALUES (
  'admin@awashinsurance.com',
  '$2a$10$X0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK',
  'System',
  'Administrator',
  'MASTER_ADMIN',
  'ACTIVE'
)
ON CONFLICT (email) DO NOTHING;

-- 11.9 Test Customer User (password: Password123!)
INSERT INTO users (email, "passwordHash", "firstName", "lastName", role, status)
VALUES (
  'customer@awashinsurance.com',
  '$2a$10$X0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK',
  'Test',
  'Customer',
  'CUSTOMER',
  'ACTIVE'
)
ON CONFLICT (email) DO NOTHING;

-- 11.10 Test Underwriting Officer (password: Password123!)
INSERT INTO users (email, "passwordHash", "firstName", "lastName", role, status)
VALUES (
  'underwriter@awashinsurance.com',
  '$2a$10$X0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK',
  'Test',
  'Underwriter',
  'UNDERWRITING_OFFICER_II',
  'ACTIVE'
)
ON CONFLICT (email) DO NOTHING;

-- 11.11 Test Claims Officer (password: Password123!)
INSERT INTO users (email, "passwordHash", "firstName", "lastName", role, status)
VALUES (
  'claims@awashinsurance.com',
  '$2a$10$X0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK1wX0hK',
  'Test',
  'Claims',
  'CLAIM_OFFICER_II',
  'ACTIVE'
)
ON CONFLICT (email) DO NOTHING;

-- 11.12 Sample Policy (to test with)
INSERT INTO policies (
  "policyNumber",
  "userId",
  type,
  status,
  "coverageAmount",
  premium,
  "premiumFrequency",
  "effectiveDate",
  "expirationDate",
  "productDetails"
)
SELECT
  'AICD/AUTO/000001/24',
  u.id,
  'AUTO',
  'ACTIVE',
  500000,
  17500,
  'ANNUALLY',
  NOW(),
  NOW() + INTERVAL '1 year',
  '{"vehicles":[{"make":"Toyota","model":"Camry","year":2023,"plateNumber":"AA-1234","vehicleValue":500000}]}'::JSONB
FROM users u
WHERE u.email = 'customer@awashinsurance.com'
ON CONFLICT ("policyNumber") DO NOTHING;