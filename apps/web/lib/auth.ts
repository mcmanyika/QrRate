import { createClient } from './supabase/server'

// Get business owner (replaces getTransporter)
export async function getBusinessOwner() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get business owned by user
  const { data: business, error } = await supabase
    .from('business')
    .select('*')
    .eq('owner_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !business) {
    return null
  }

  return business
}

// Require business owner (throws if not found)
export async function requireBusinessOwner() {
  const business = await getBusinessOwner()
  
  if (!business) {
    throw new Error('Unauthorized - Business owner required')
  }

  return business
}

// Legacy function for backward compatibility (deprecated)
// Maps to getBusinessOwner for transporters that were migrated
export async function getTransporter() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Try to get business first (new system)
  const business = await getBusinessOwner()
  if (business) {
    return business
  }

  // Fallback to old transporter table for backward compatibility
  const { data: transporter, error } = await supabase
    .from('transporter')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !transporter) {
    return null
  }

  return transporter
}

// Legacy function for backward compatibility (deprecated)
export async function requireTransporter() {
  const transporter = await getTransporter()
  
  if (!transporter) {
    throw new Error('Unauthorized')
  }

  return transporter
}
