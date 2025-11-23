import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const transporter = await requireTransporter()
    return NextResponse.json(transporter)
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const transporter = await requireTransporter()
    const body = await request.json()
    const { name, phone, email, profile_image_url } = body

    const supabase = await createClient()

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (profile_image_url !== undefined) updateData.profile_image_url = profile_image_url

    const { data, error } = await supabase
      .from('transporter')
      .update(updateData)
      .eq('id', transporter.id)
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

