-- ============================================================================
-- DROP TRANSPORTER AND VEHICLE-RELATED TABLES
-- This migration removes all transporter-related tables that are no longer needed
-- after migrating to the universal review system
-- ============================================================================

-- Drop dependent tables first (in reverse order of dependencies)

-- Drop expense_approval (references expense)
drop table if exists expense_approval cascade;

-- Drop expense (references transporter and vehicle - vehicle already dropped)
drop table if exists expense cascade;

-- Drop transporter_subscription (references transporter)
drop table if exists transporter_subscription cascade;

-- Drop subscription_plan (no longer needed - can be recreated if subscriptions are re-implemented)
drop table if exists subscription_plan cascade;

-- Drop staff (references transporter)
drop table if exists staff cascade;

-- Drop driver (references transporter)
drop table if exists driver cascade;

-- Drop conductor (references transporter)
drop table if exists conductor cascade;

-- Drop service_provider (may reference vehicles via junction table)
drop table if exists service_provider cascade;

-- Drop transporter (main table - drop last)
drop table if exists transporter cascade;

-- Drop functions that are no longer needed
drop function if exists update_transporter_updated_at() cascade;
drop function if exists update_subscription_plan_updated_at() cascade;
drop function if exists update_transporter_subscription_updated_at() cascade;

-- Note: The 'business' table now serves the role that 'transporter' used to serve.
-- User data is linked via business.owner_id which references auth.users.id directly.

