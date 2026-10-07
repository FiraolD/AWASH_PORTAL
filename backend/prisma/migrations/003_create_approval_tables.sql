-- Create approval_rules table
CREATE TABLE IF NOT EXISTS approval_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    min_sum_insured DECIMAL(15, 2),
    max_sum_insured DECIMAL(15, 2),
    min_risk_score INTEGER DEFAULT 0,
    max_risk_score INTEGER DEFAULT 100,
    approval_levels JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_approval_rules_product ON approval_rules(product_type);
CREATE INDEX IF NOT EXISTS idx_approval_rules_active ON approval_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_approval_rules_amount ON approval_rules(min_sum_insured, max_sum_insured);

-- Insert sample approval rules
INSERT INTO approval_rules (rule_name, product_type, min_sum_insured, max_sum_insured, approval_levels) VALUES
    ('Low Value Auto Policies', 'AUTO', 0, 250000, '["UNDERWRITING_OFFICER_I", "UNDERWRITING_OFFICER_II"]'),
    ('Medium Value Auto Policies', 'AUTO', 250001, 1000000, '["UNDERWRITING_OFFICER_II", "SENIOR_UNDERWRITING_OFFICER", "MANAGER_UNDERWRITING"]'),
    ('High Value Auto Policies', 'AUTO', 1000001, NULL, '["SENIOR_UNDERWRITING_OFFICER", "MANAGER_UNDERWRITING", "HEAD_UNDERWRITING"]')
ON CONFLICT DO NOTHING;