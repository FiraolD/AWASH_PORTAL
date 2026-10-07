-- Create role_levels table if it doesn't exist
CREATE TABLE IF NOT EXISTS role_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_code TEXT UNIQUE NOT NULL,
    level_name TEXT NOT NULL,
    department TEXT,
    level_order INTEGER NOT NULL,
    can_approve BOOLEAN DEFAULT TRUE,
    can_reject BOOLEAN DEFAULT TRUE,
    max_amount_limit DECIMAL(15, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert role levels if they don't exist
INSERT INTO role_levels (level_code, level_name, department, level_order, can_approve, can_reject, max_amount_limit) VALUES
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
ON CONFLICT (level_code) DO NOTHING;