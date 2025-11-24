import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await requireTransporter()
    const body = await request.json()
    const { name, phone, role, license_number, is_active } = body

    const supabase = await createClient()

    // Verify staff belongs to transporter
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('id', params.id)
      .eq('transporter_id', transporter.id)
      .single()

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (role !== undefined) {
      if (role !== 'driver' && role !== 'conductor') {
        return NextResponse.json(
          { error: 'Role must be either "driver" or "conductor"' },
          { status: 400 }
        )
      }
      updateData.role = role
    }
    if (license_number !== undefined) {
      updateData.license_number = license_number?.trim() || null
    }
    if (is_active !== undefined) updateData.is_active = is_active
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', params.id)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()

    // Verify staff belongs to transporter
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('id', params.id)
      .eq('transporter_id', transporter.id)
      .single()

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

