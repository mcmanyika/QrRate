import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const expenseId = params.id

    const { data: expense, error } = await supabase
      .from('expense')
      .select(`
        *,
        vehicle:vehicle_id(id, reg_number),
        service_provider:service_provider_id(id, name),
        staff:staff_id(id, name),
        expense_approval(*)
      `)
      .eq('id', expenseId)
      .eq('transporter_id', transporter.id)
      .single()

    if (error || !expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(expense)
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const expenseId = params.id
    const body = await request.json()
    const {
      vehicle_id,
      category,
      amount,
      currency,
      date,
      description,
      vendor,
      payment_method,
      receipt_url,
      is_recurring,
      recurring_frequency,
      service_provider_id,
      staff_id,
    } = body

    // Verify expense belongs to transporter
    const { data: existing } = await supabase
      .from('expense')
      .select('id, status')
      .eq('id', expenseId)
      .eq('transporter_id', transporter.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    // Don't allow editing approved expenses (unless changing to pending)
    if (existing.status === 'approved' && body.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot edit approved expense' },
        { status: 400 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (vehicle_id !== undefined) {
      // Verify vehicle belongs to transporter
      const { data: vehicle } = await supabase
        .from('vehicle')
        .select('id')
        .eq('id', vehicle_id)
        .eq('transporter_id', transporter.id)
        .single()

      if (!vehicle) {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          { status: 404 }
        )
      }
      updateData.vehicle_id = vehicle_id
    }

    if (category !== undefined) {
      if (!['fuel', 'maintenance', 'insurance', 'staff_payment', 'service_provider_payment', 'other'].includes(category)) {
        return NextResponse.json(
          { error: 'Invalid category' },
          { status: 400 }
        )
      }
      updateData.category = category
    }

    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be greater than 0' },
          { status: 400 }
        )
      }
      updateData.amount = parseFloat(amount)
    }

    if (currency !== undefined) updateData.currency = currency
    if (date !== undefined) updateData.date = date
    if (description !== undefined) updateData.description = description?.trim() || null
    if (vendor !== undefined) updateData.vendor = vendor?.trim() || null
    if (payment_method !== undefined) updateData.payment_method = payment_method || null
    if (receipt_url !== undefined) updateData.receipt_url = receipt_url || null
    if (is_recurring !== undefined) {
      updateData.is_recurring = Boolean(is_recurring)
      if (!is_recurring) {
        updateData.recurring_frequency = null
      }
    }
    if (recurring_frequency !== undefined && is_recurring) {
      if (recurring_frequency && !['monthly', 'quarterly', 'yearly'].includes(recurring_frequency)) {
        return NextResponse.json(
          { error: 'Invalid recurring frequency' },
          { status: 400 }
        )
      }
      updateData.recurring_frequency = recurring_frequency || null
    }

    if (service_provider_id !== undefined) {
      if (service_provider_id) {
        const { data: serviceProvider } = await supabase
          .from('service_provider')
          .select('id')
          .eq('id', service_provider_id)
          .eq('transporter_id', transporter.id)
          .single()

        if (!serviceProvider) {
          return NextResponse.json(
            { error: 'Service provider not found' },
            { status: 404 }
          )
        }
      }
      updateData.service_provider_id = service_provider_id || null
    }

    if (staff_id !== undefined) {
      if (staff_id) {
        const { data: staff } = await supabase
          .from('staff')
          .select('id')
          .eq('id', staff_id)
          .eq('transporter_id', transporter.id)
          .single()

        if (!staff) {
          return NextResponse.json(
            { error: 'Staff not found' },
            { status: 404 }
          )
        }
      }
      updateData.staff_id = staff_id || null
    }

    // Allow status change to pending for re-submission
    if (body.status === 'pending' && existing.status !== 'pending') {
      updateData.status = 'pending'
      updateData.approved_by = null
      updateData.approved_at = null
    }

    const { data, error } = await supabase
      .from('expense')
      .update(updateData)
      .eq('id', expenseId)
      .select(`
        *,
        vehicle:vehicle_id(id, reg_number),
        service_provider:service_provider_id(id, name),
        staff:staff_id(id, name)
      `)
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
    const expenseId = params.id

    // Verify expense belongs to transporter
    const { data: existing } = await supabase
      .from('expense')
      .select('id')
      .eq('id', expenseId)
      .eq('transporter_id', transporter.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('expense')
      .delete()
      .eq('id', expenseId)

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

