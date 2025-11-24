import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // Optional filter: 'driver' or 'conductor'

    let query = supabase
      .from('staff')
      .select('*')
      .eq('transporter_id', transporter.id)
      .order('name', { ascending: true })

    if (role && (role === 'driver' || role === 'conductor')) {
      query = query.eq('role', role)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const transporter = await requireTransporter()
    const body = await request.json()
    const { name, phone, role, license_number } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!role || (role !== 'driver' && role !== 'conductor')) {
      return NextResponse.json(
        { error: 'Role must be either "driver" or "conductor"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('staff')
      .insert({
        transporter_id: transporter.id,
        name: name.trim(),
        phone: phone?.trim() || null,
        role: role,
        license_number: role === 'driver' ? (license_number?.trim() || null) : null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

