'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Pagination from '@/components/dashboard/Pagination'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Expense {
  id: string
  vehicle_id: string
  category: 'fuel' | 'maintenance' | 'insurance' | 'staff_payment' | 'service_provider_payment' | 'other'
  amount: number
  currency: string
  date: string
  description?: string | null
  vendor?: string | null
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'other' | null
  receipt_url?: string | null
  is_recurring: boolean
  recurring_frequency?: 'monthly' | 'quarterly' | 'yearly' | null
  status: 'pending' | 'approved' | 'rejected'
  service_provider_id?: string | null
  staff_id?: string | null
  vehicle?: {
    id: string
    reg_number: string
  } | null
  service_provider?: {
    id: string
    name: string
  } | null
  staff?: {
    id: string
    name: string
  } | null
}

interface Vehicle {
  id: string
  reg_number: string
}

interface ServiceProvider {
  id: string
  name: string
  service_type: string
}

interface Staff {
  id: string
  name: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ExpensesPage() {
  const searchParams = useSearchParams()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState({
    vehicle_id: '',
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || '',
    date_from: '',
    date_to: '',
    search: '',
  })
  const [formData, setFormData] = useState({
    vehicle_id: '',
    category: 'fuel' as Expense['category'],
    amount: '',
    currency: 'usd',
    date: new Date().toISOString().split('T')[0],
    description: '',
    vendor: '',
    payment_method: '' as Expense['payment_method'] | '',
    receipt_url: '',
    is_recurring: false,
    recurring_frequency: '' as Expense['recurring_frequency'] | '',
    service_provider_id: '',
    staff_id: '',
  })

  useEffect(() => {
    fetchExpenses()
    fetchVehicles()
    fetchServiceProviders()
    fetchStaff()
  }, [currentPage, filters])

  async function fetchExpenses() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      })
      if (filters.vehicle_id) params.append('vehicle_id', filters.vehicle_id)
      if (filters.category) params.append('category', filters.category)
      if (filters.status) params.append('status', filters.status)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      if (filters.search) params.append('search', filters.search)

      const response = await fetch(`/api/transporter/expenses?${params}`)
      if (response.ok) {
        const result = await response.json()
        setExpenses(result.data || [])
        setPagination(result.pagination || pagination)
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchVehicles() {
    try {
      const response = await fetch('/api/transporter/vehicles?limit=1000')
      if (response.ok) {
        const result = await response.json()
        setVehicles(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error)
    }
  }

  async function fetchServiceProviders() {
    try {
      const response = await fetch('/api/transporter/service-providers')
      if (response.ok) {
        const data = await response.json()
        setServiceProviders(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch service providers:', error)
    }
  }

  async function fetchStaff() {
    try {
      const response = await fetch('/api/transporter/staff')
      if (response.ok) {
        const data = await response.json()
        setStaff(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    }
  }

  async function handleAddExpense() {
    if (!formData.vehicle_id || !formData.amount || !formData.date) return

    try {
      const response = await fetch('/api/transporter/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: formData.vehicle_id,
          category: formData.category,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          date: formData.date,
          description: formData.description || null,
          vendor: formData.vendor || null,
          payment_method: formData.payment_method || null,
          receipt_url: formData.receipt_url || null,
          is_recurring: formData.is_recurring,
          recurring_frequency: formData.is_recurring ? (formData.recurring_frequency || null) : null,
          service_provider_id: formData.service_provider_id || null,
          staff_id: formData.staff_id || null,
        }),
      })

      if (response.ok) {
        resetForm()
        setShowAddForm(false)
        fetchExpenses()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add expense')
      }
    } catch (error) {
      console.error('Failed to add expense:', error)
      alert('Failed to add expense')
    }
  }

  function handleEdit(expense: Expense) {
    setEditingExpense(expense)
    setFormData({
      vehicle_id: expense.vehicle_id,
      category: expense.category,
      amount: expense.amount.toString(),
      currency: expense.currency,
      date: expense.date,
      description: expense.description || '',
      vendor: expense.vendor || '',
      payment_method: expense.payment_method || '',
      receipt_url: expense.receipt_url || '',
      is_recurring: expense.is_recurring,
      recurring_frequency: expense.recurring_frequency || '',
      service_provider_id: expense.service_provider_id || '',
      staff_id: expense.staff_id || '',
    })
    setShowAddForm(false)
  }

  async function handleUpdateExpense() {
    if (!editingExpense || !formData.vehicle_id || !formData.amount || !formData.date) return

    try {
      const response = await fetch(`/api/transporter/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: formData.vehicle_id,
          category: formData.category,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          date: formData.date,
          description: formData.description || null,
          vendor: formData.vendor || null,
          payment_method: formData.payment_method || null,
          receipt_url: formData.receipt_url || null,
          is_recurring: formData.is_recurring,
          recurring_frequency: formData.is_recurring ? (formData.recurring_frequency || null) : null,
          service_provider_id: formData.service_provider_id || null,
          staff_id: formData.staff_id || null,
          status: 'pending', // Reset to pending when editing
        }),
      })

      if (response.ok) {
        setEditingExpense(null)
        resetForm()
        fetchExpenses()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update expense')
      }
    } catch (error) {
      console.error('Failed to update expense:', error)
      alert('Failed to update expense')
    }
  }

  async function handleDelete(expenseId: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const response = await fetch(`/api/transporter/expenses/${expenseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchExpenses()
      }
    } catch (error) {
      console.error('Failed to delete expense:', error)
    }
  }

  async function handleApprove(expenseId: string) {
    try {
      const response = await fetch(`/api/transporter/expenses/${expenseId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        fetchExpenses()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to approve expense')
      }
    } catch (error) {
      console.error('Failed to approve expense:', error)
      alert('Failed to approve expense')
    }
  }

  async function handleReject(expenseId: string) {
    const comments = prompt('Please provide a reason for rejection:')
    if (!comments || !comments.trim()) return

    try {
      const response = await fetch(`/api/transporter/expenses/${expenseId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments }),
      })

      if (response.ok) {
        fetchExpenses()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to reject expense')
      }
    } catch (error) {
      console.error('Failed to reject expense:', error)
      alert('Failed to reject expense')
    }
  }

  function resetForm() {
    setFormData({
      vehicle_id: '',
      category: 'fuel',
      amount: '',
      currency: 'usd',
      date: new Date().toISOString().split('T')[0],
      description: '',
      vendor: '',
      payment_method: '',
      receipt_url: '',
      is_recurring: false,
      recurring_frequency: '',
      service_provider_id: '',
      staff_id: '',
    })
  }

  function getCategoryLabel(category: string) {
    const labels: Record<string, string> = {
      fuel: 'Fuel',
      maintenance: 'Maintenance',
      insurance: 'Insurance',
      staff_payment: 'Staff Payment',
      service_provider_payment: 'Service Provider Payment',
      other: 'Other',
    }
    return labels[category] || category
  }

  function getPaymentMethodLabel(method: string | null | undefined) {
    if (!method) return '-'
    const labels: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      bank_transfer: 'Bank Transfer',
      mobile_money: 'Mobile Money',
      other: 'Other',
    }
    return labels[method] || method
  }

  function handlePageChange(page: number) {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearFilters() {
    setFilters({
      vehicle_id: '',
      category: '',
      status: '',
      date_from: '',
      date_to: '',
      search: '',
    })
    setCurrentPage(1)
  }

  if (loading && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Expenses</h1>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingExpense(null)
            resetForm()
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          {showAddForm || editingExpense ? 'Cancel' : 'Add Expense'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vehicle
            </label>
            <select
              value={filters.vehicle_id}
              onChange={(e) => setFilters({ ...filters, vehicle_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.reg_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">All Categories</option>
              <option value="fuel">Fuel</option>
              <option value="maintenance">Maintenance</option>
              <option value="insurance">Insurance</option>
              <option value="staff_payment">Staff Payment</option>
              <option value="service_provider_payment">Service Provider Payment</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Description, vendor..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingExpense) && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Vehicle *
                </label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  required
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.reg_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  required
                >
                  <option value="fuel">Fuel</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="insurance">Insurance</option>
                  <option value="staff_payment">Staff Payment</option>
                  <option value="service_provider_payment">Service Provider Payment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="usd">USD</option>
                  <option value="zwl">ZWL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Vendor
                </label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Vendor name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method || ''}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as Expense['payment_method'] | '' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">Select Payment Method</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Expense description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Service Provider (Optional)
                </label>
                <select
                  value={formData.service_provider_id}
                  onChange={(e) => setFormData({ ...formData, service_provider_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">None</option>
                  {serviceProviders.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Staff (Optional)
                </label>
                <select
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">None</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Receipt URL
              </label>
              <input
                type="url"
                value={formData.receipt_url}
                onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked, recurring_frequency: e.target.checked ? 'monthly' : '' })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Recurring Expense</span>
              </label>
              {formData.is_recurring && (
                <select
                  value={formData.recurring_frequency || ''}
                  onChange={(e) => setFormData({ ...formData, recurring_frequency: e.target.value as Expense['recurring_frequency'] | '' })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingExpense(null)
                  resetForm()
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={editingExpense ? handleUpdateExpense : handleAddExpense}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                {editingExpense ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No expenses found. Add your first expense!</p>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {expense.vehicle?.reg_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getCategoryLabel(expense.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {expense.currency.toUpperCase()} {parseFloat(expense.amount.toString()).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {expense.vendor || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getPaymentMethodLabel(expense.payment_method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          expense.status === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : expense.status === 'rejected'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {expense.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(expense.id)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(expense.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
            />
          </div>
        </>
      )}
    </div>
  )
}

