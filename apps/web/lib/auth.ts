import { createClient } from './supabase/server'

export async function getTransporter() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

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

export async function requireTransporter() {
  const transporter = await getTransporter()
  
  if (!transporter) {
    throw new Error('Unauthorized')
  }

  return transporter
}

