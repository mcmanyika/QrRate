import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const expenseId = params.id
    const body = await request.json()
    const { comments } = body

    if (!comments || !comments.trim()) {
      return NextResponse.json(
        { error: 'Comments are required for rejection' },
        { status: 400 }
      )
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify expense belongs to transporter
    const { data: expense } = await supabase
      .from('expense')
      .select('id, status')
      .eq('id', expenseId)
      .eq('transporter_id', transporter.id)
      .single()

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (expense.status === 'rejected') {
      return NextResponse.json(
        { error: 'Expense already rejected' },
        { status: 400 }
      )
    }

    // Update expense status
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expense')
      .update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', expenseId)
      .select(`
        *,
        vehicle:vehicle_id(id, reg_number),
        service_provider:service_provider_id(id, name),
        staff:staff_id(id, name)
      `)
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    // Create approval record
    const { error: approvalError } = await supabase
      .from('expense_approval')
      .insert({
        expense_id: expenseId,
        approver_user_id: user.id,
        status: 'rejected',
        comments: comments.trim(),
      })

    if (approvalError) {
      console.error('Failed to create approval record:', approvalError)
      // Don't fail the request if approval record creation fails
    }

    return NextResponse.json(updatedExpense)
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

