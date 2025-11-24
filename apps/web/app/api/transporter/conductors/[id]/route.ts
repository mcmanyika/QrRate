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
    const { name, phone, is_active } = body

    const supabase = await createClient()

    // Verify conductor belongs to transporter
    const { data: conductor, error: conductorError } = await supabase
      .from('conductor')
      .select('id')
      .eq('id', params.id)
      .eq('transporter_id', transporter.id)
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json(
        { error: 'Conductor not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (is_active !== undefined) updateData.is_active = is_active
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('conductor')
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

    // Verify conductor belongs to transporter
    const { data: conductor, error: conductorError } = await supabase
      .from('conductor')
      .select('id')
      .eq('id', params.id)
      .eq('transporter_id', transporter.id)
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json(
        { error: 'Conductor not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('conductor')
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

