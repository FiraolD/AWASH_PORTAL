-- Create claims_assignment_rules table
CREATE TABLE IF NOT EXISTS claims_assignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    min_amount DECIMAL(15, 2) NOT NULL,
    max_amount DECIMAL(15, 2),
    assigned_role TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_claims_assignment_product ON claims_assignment_rules(product_type);
CREATE INDEX IF NOT EXISTS idx_claims_assignment_active ON claims_assignment_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_claims_assignment_priority ON claims_assignment_rules(priority);

-- Insert sample assignment rules
INSERT INTO claims_assignment_rules (rule_name, product_type, min_amount, max_amount, assigned_role, priority) VALUES
    ('Low Value Claims', 'ALL', 0, 50000, 'CLAIM_OFFICER_I', 1),
    ('Medium Value Claims', 'ALL', 50001, 200000, 'CLAIM_OFFICER_II', 2),
    ('High Value Claims', 'ALL', 200001, 1000000, 'SENIOR_CLAIM_OFFICER', 3),
    ('Very High Value Claims', 'ALL', 1000001, NULL, 'MANAGER_CLAIMS', 4)
ON CONFLICT DO NOTHING;