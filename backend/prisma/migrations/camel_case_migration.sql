-- ============================================================================
-- MIGRATION: Snake Case → Camel Case Column Names
-- ============================================================================
-- Backup your database before running these!
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. approval_rules
-- ============================================================================
ALTER TABLE approval_rules 
  RENAME COLUMN rule_name TO "ruleName";
ALTER TABLE approval_rules 
  RENAME COLUMN product_type TO "productType";
ALTER TABLE approval_rules 
  RENAME COLUMN required_roles TO "requiredRoles";
ALTER TABLE approval_rules 
  RENAME COLUMN min_sum_insured TO "minSumInsured";
ALTER TABLE approval_rules 
  RENAME COLUMN max_sum_insured TO "maxSumInsured";
ALTER TABLE approval_rules 
  RENAME COLUMN min_risk_score TO "minRiskScore";
ALTER TABLE approval_rules 
  RENAME COLUMN max_risk_score TO "maxRiskScore";
ALTER TABLE approval_rules 
  RENAME COLUMN is_active TO "isActive";
ALTER TABLE approval_rules 
  RENAME COLUMN approval_levels TO "approvalLevels";
ALTER TABLE approval_rules 
  RENAME COLUMN created_at TO "createdAt";
  ALTER TABLE approval_rules 
  RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE approval_rules 
  RENAME COLUMN created_by TO "createdBy";

-- ============================================================================
-- 2. audit_logs
-- ============================================================================
ALTER TABLE audit_logs 
  RENAME COLUMN user_id TO "userId";
ALTER TABLE audit_logs 
  RENAME COLUMN user_email TO "userEmail";
ALTER TABLE audit_logs 
  RENAME COLUMN user_role TO "userRole";
ALTER TABLE audit_logs 
  RENAME COLUMN action_type TO "actionType";
ALTER TABLE audit_logs 
  RENAME COLUMN entity_type TO "entityType";
ALTER TABLE audit_logs 
  RENAME COLUMN entity_id TO "entityId";
ALTER TABLE audit_logs 
  RENAME COLUMN old_values TO "oldValues";
ALTER TABLE audit_logs 
  RENAME COLUMN new_values TO "newValues";
ALTER TABLE audit_logs 
  RENAME COLUMN ip_address TO "ipAddress";
ALTER TABLE audit_logs 
  RENAME COLUMN user_agent TO "userAgent";
ALTER TABLE audit_logs 
  RENAME COLUMN created_at TO "createdAt";

-- ============================================================================
-- 3. claims_assignment_rules
-- ============================================================================
ALTER TABLE claims_assignment_rules 
  RENAME COLUMN rule_name TO "ruleName";
ALTER TABLE claims_assignment_rules 
  RENAME COLUMN product_type TO "productType";
ALTER TABLE claims_assignment_rules 
  RENAME COLUMN claim_type TO "claimType";
ALTER TABLE claims_assignment_rules 
  RENAME COLUMN min_amount TO "minAmount";
ALTER TABLE claims_assignment_rules 
  RENAME COLUMN max_amount TO "maxAmount";
ALTER TABLE claims_assignment_rules 
  RENAME COLUMN assigned_role TO "assignedRole";
ALTER TABLE claims_assignment_rules 
  RENAME COLUMN priority_level TO "priorityLevel";
ALTER TABLE claims_assignment_rules 
  RENAME COLUMN is_active TO "isActive";
ALTER TABLE claims_assignment_rules 
  RENAME COLUMN created_at TO "createdAt";
ALTER TABLE claims_assignment_rules 
  RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE claims_assignment_rules 
  RENAME COLUMN created_by TO "createdBy";

-- ============================================================================
-- 4. premium_rates
-- ============================================================================
ALTER TABLE premium_rates 
  RENAME COLUMN product_type TO "productType";
ALTER TABLE premium_rates 
  RENAME COLUMN rate_name TO "rateName";
ALTER TABLE premium_rates 
  RENAME COLUMN base_rate TO "baseRate";
ALTER TABLE premium_rates 
  RENAME COLUMN min_rate TO "minRate";
ALTER TABLE premium_rates 
  RENAME COLUMN max_rate TO "maxRate";
ALTER TABLE premium_rates 
  RENAME COLUMN calculation_type TO "calculationType";
ALTER TABLE premium_rates 
  RENAME COLUMN is_percentage TO "isPercentage";
ALTER TABLE premium_rates 
  RENAME COLUMN effective_from TO "effectiveFrom";
ALTER TABLE premium_rates 
  RENAME COLUMN effective_to TO "effectiveTo";
ALTER TABLE premium_rates 
  RENAME COLUMN is_active TO "isActive";
ALTER TABLE premium_rates 
  RENAME COLUMN created_at TO "createdAt";
ALTER TABLE premium_rates 
  RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE premium_rates 
  RENAME COLUMN created_by TO "createdBy";

-- ============================================================================
-- 5. role_levels
-- ============================================================================
ALTER TABLE role_levels 
  RENAME COLUMN role_name TO "roleName";
ALTER TABLE role_levels 
  RENAME COLUMN display_name TO "displayName";
ALTER TABLE role_levels 
  RENAME COLUMN hierarchy_level TO "hierarchyLevel";
ALTER TABLE role_levels 
  RENAME COLUMN department TO "department";
ALTER TABLE role_levels 
  RENAME COLUMN can_approve TO "canApprove";
ALTER TABLE role_levels 
  RENAME COLUMN can_reject TO "canReject";
ALTER TABLE role_levels 
  RENAME COLUMN can_review TO "canReview";
ALTER TABLE role_levels 
  RENAME COLUMN max_approval_amount TO "maxApprovalAmount";
ALTER TABLE role_levels 
  RENAME COLUMN is_active TO "isActive";
ALTER TABLE role_levels 
  RENAME COLUMN created_at TO "createdAt";
ALTER TABLE role_levels 
  RENAME COLUMN updated_at TO "updatedAt";

-- ============================================================================
-- 6. system_settings
-- ============================================================================
ALTER TABLE system_settings 
  RENAME COLUMN setting_key TO "settingKey";
ALTER TABLE system_settings 
  RENAME COLUMN setting_value TO "settingValue";
ALTER TABLE system_settings 
  RENAME COLUMN setting_type TO "settingType";
ALTER TABLE system_settings 
  RENAME COLUMN description TO "description";
ALTER TABLE system_settings 
  RENAME COLUMN is_public TO "isPublic";
ALTER TABLE system_settings 
  RENAME COLUMN created_at TO "createdAt";
ALTER TABLE system_settings 
  RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE system_settings 
  RENAME COLUMN updated_by TO "updatedBy";

-- ============================================================================
-- 7. hospital_list
-- ============================================================================
ALTER TABLE hospital_list 
  RENAME COLUMN hospital_name TO "hospitalName";
ALTER TABLE hospital_list 
  RENAME COLUMN is_active TO "isActive";
ALTER TABLE hospital_list 
  RENAME COLUMN created_at TO "createdAt";
ALTER TABLE hospital_list 
  RENAME COLUMN updated_at TO "updatedAt";

-- ============================================================================
-- 8. migrations
-- ============================================================================
ALTER TABLE migrations 
  RENAME COLUMN migration_name TO "migrationName";
ALTER TABLE migrations 
  RENAME COLUMN executed_at TO "executedAt";

COMMIT;