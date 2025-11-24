import { NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()

    // Get current month start and end
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    // Get all expenses for transporter
    const { data: allExpenses } = await supabase
      .from('expense')
      .select('amount, category, vehicle_id, status, date')
      .eq('transporter_id', transporter.id)

    // Get current month expenses
    const { data: currentMonthExpenses } = await supabase
      .from('expense')
      .select('amount, category, vehicle_id')
      .eq('transporter_id', transporter.id)
      .gte('date', currentMonthStart)
      .lte('date', currentMonthEnd)

    // Calculate totals
    const totalExpenses = allExpenses?.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0
    const currentMonthTotal = currentMonthExpenses?.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0

    // Pending approvals count
    const pendingCount = allExpenses?.filter(e => e.status === 'pending').length || 0

    // Expenses by category
    const expensesByCategory: Record<string, number> = {}
    allExpenses?.forEach((expense) => {
      const category = expense.category
      expensesByCategory[category] = (expensesByCategory[category] || 0) + parseFloat(expense.amount.toString())
    })

    // Top expense category
    const topCategory = Object.entries(expensesByCategory).reduce((a, b) => 
      expensesByCategory[a[0]] > expensesByCategory[b[0]] ? a : b,
      ['other', 0]
    )[0]

    // Expenses by vehicle (top 5)
    const expensesByVehicle: Record<string, number> = {}
    allExpenses?.forEach((expense) => {
      const vehicleId = expense.vehicle_id
      expensesByVehicle[vehicleId] = (expensesByVehicle[vehicleId] || 0) + parseFloat(expense.amount.toString())
    })

    const topVehicles = Object.entries(expensesByVehicle)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([vehicleId, amount]) => ({ vehicle_id: vehicleId, total: amount }))

    // Get vehicle details for top vehicles
    if (topVehicles.length > 0) {
      const vehicleIds = topVehicles.map(v => v.vehicle_id)
      const { data: vehicles } = await supabase
        .from('vehicle')
        .select('id, reg_number')
        .in('id', vehicleIds)

      topVehicles.forEach((tv) => {
        const vehicle = vehicles?.find(v => v.id === tv.vehicle_id)
        if (vehicle) {
          (tv as any).reg_number = vehicle.reg_number
        }
      })
    }

    return NextResponse.json({
      total_expenses: totalExpenses,
      current_month_total: currentMonthTotal,
      pending_approvals: pendingCount,
      top_category: topCategory,
      expenses_by_category: expensesByCategory,
      top_vehicles: topVehicles,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

