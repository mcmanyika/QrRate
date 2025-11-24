import { NextRequest, NextResponse } from 'next/server'
import { requireTransporter } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const transporter = await requireTransporter()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const vehicleId = searchParams.get('vehicle_id')
    const category = searchParams.get('category')
    const groupBy = searchParams.get('group_by') || 'none' // 'vehicle', 'category', 'month', 'none'

    let query = supabase
      .from('expense')
      .select('amount, category, vehicle_id, date, status')
      .eq('transporter_id', transporter.id)
      .eq('status', 'approved') // Only include approved expenses in reports

    if (dateFrom) {
      query = query.gte('date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('date', dateTo)
    }

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId)
    }

    if (category && ['fuel', 'maintenance', 'insurance', 'staff_payment', 'service_provider_payment', 'other'].includes(category)) {
      query = query.eq('category', category)
    }

    const { data: expenses, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    const expensesList = expenses || []

    let groupedData: any = {}

    if (groupBy === 'vehicle') {
      // Group by vehicle
      const vehicleIds = Array.from(new Set(expensesList.map(e => e.vehicle_id)))
      const { data: vehicles } = await supabase
        .from('vehicle')
        .select('id, reg_number')
        .in('id', vehicleIds)

      expensesList.forEach((expense) => {
        const vehicleId = expense.vehicle_id
        if (!groupedData[vehicleId]) {
          const vehicle = vehicles?.find(v => v.id === vehicleId)
          groupedData[vehicleId] = {
            vehicle_id: vehicleId,
            vehicle_reg_number: vehicle?.reg_number || 'Unknown',
            total: 0,
            count: 0,
          }
        }
        groupedData[vehicleId].total += parseFloat(expense.amount.toString())
        groupedData[vehicleId].count += 1
      })

      groupedData = Object.values(groupedData)
    } else if (groupBy === 'category') {
      // Group by category
      expensesList.forEach((expense) => {
        const cat = expense.category
        if (!groupedData[cat]) {
          groupedData[cat] = {
            category: cat,
            total: 0,
            count: 0,
          }
        }
        groupedData[cat].total += parseFloat(expense.amount.toString())
        groupedData[cat].count += 1
      })

      groupedData = Object.values(groupedData)
    } else if (groupBy === 'month') {
      // Group by month
      expensesList.forEach((expense) => {
        const date = new Date(expense.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' })
        
        if (!groupedData[monthKey]) {
          groupedData[monthKey] = {
            month: monthKey,
            month_name: monthName,
            total: 0,
            count: 0,
          }
        }
        groupedData[monthKey].total += parseFloat(expense.amount.toString())
        groupedData[monthKey].count += 1
      })

      groupedData = Object.values(groupedData).sort((a: any, b: any) => a.month.localeCompare(b.month))
    } else {
      // No grouping - return summary
      const total = expensesList.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
      groupedData = {
        total,
        count: expensesList.length,
        expenses: expensesList,
      }
    }

    return NextResponse.json({
      group_by: groupBy,
      data: groupedData,
      summary: {
        total: expensesList.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0),
        count: expensesList.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

