'use client'

import { useEffect, useState } from 'react'

interface Staff {
  id: string
  name: string
  phone?: string | null
  role: 'driver' | 'conductor'
  license_number?: string | null
  is_active: boolean
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [roleFilter, setRoleFilter] = useState<'all' | 'driver' | 'conductor'>('all')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'driver' as 'driver' | 'conductor',
    license_number: '',
  })

  useEffect(() => {
    fetchStaff()
  }, [roleFilter])

  async function fetchStaff() {
    setLoading(true)
    try {
      const url = roleFilter === 'all' 
        ? '/api/transporter/staff'
        : `/api/transporter/staff?role=${roleFilter}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setStaff(data)
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddStaff() {
    if (!formData.name.trim()) return

    try {
      const response = await fetch('/api/transporter/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          role: formData.role,
          license_number: formData.role === 'driver' ? (formData.license_number || null) : null,
        }),
      })

      if (response.ok) {
        setFormData({ name: '', phone: '', role: 'driver', license_number: '' })
        setShowAddForm(false)
        fetchStaff()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add staff')
      }
    } catch (error) {
      console.error('Failed to add staff:', error)
      alert('Failed to add staff')
    }
  }

  function handleEdit(staffMember: Staff) {
    setEditingStaff(staffMember)
    setFormData({
      name: staffMember.name,
      phone: staffMember.phone || '',
      role: staffMember.role,
      license_number: staffMember.license_number || '',
    })
    setShowAddForm(false)
  }

  async function handleUpdateStaff() {
    if (!editingStaff || !formData.name.trim()) return

    try {
      const response = await fetch(`/api/transporter/staff/${editingStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          role: formData.role,
          license_number: formData.role === 'driver' ? (formData.license_number || null) : null,
          is_active: editingStaff.is_active,
        }),
      })

      if (response.ok) {
        setEditingStaff(null)
        setFormData({ name: '', phone: '', role: 'driver', license_number: '' })
        fetchStaff()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update staff')
      }
    } catch (error) {
      console.error('Failed to update staff:', error)
      alert('Failed to update staff')
    }
  }

  async function handleDelete(staffId: string) {
    if (!confirm('Are you sure you want to delete this staff member?')) return

    try {
      const response = await fetch(`/api/transporter/staff/${staffId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchStaff()
      }
    } catch (error) {
      console.error('Failed to delete staff:', error)
    }
  }

  async function handleToggleActive(staffMember: Staff) {
    try {
      const response = await fetch(`/api/transporter/staff/${staffMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: staffMember.name,
          phone: staffMember.phone,
          role: staffMember.role,
          license_number: staffMember.license_number,
          is_active: !staffMember.is_active,
        }),
      })

      if (response.ok) {
        fetchStaff()
      }
    } catch (error) {
      console.error('Failed to update staff:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Staff</h1>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingStaff(null)
            setFormData({ name: '', phone: '', role: 'driver', license_number: '' })
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          {showAddForm || editingStaff ? 'Cancel' : 'Add Staff'}
        </button>
      </div>

      {/* Role Filter */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setRoleFilter('all')}
          className={`px-4 py-2 rounded-md ${
            roleFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setRoleFilter('driver')}
          className={`px-4 py-2 rounded-md ${
            roleFilter === 'driver'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Drivers
        </button>
        <button
          onClick={() => setRoleFilter('conductor')}
          className={`px-4 py-2 rounded-md ${
            roleFilter === 'conductor'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Conductors
        </button>
      </div>

      {(showAddForm || editingStaff) && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingStaff ? 'Edit Staff' : 'Add New Staff'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Staff name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'driver' | 'conductor' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="driver">Driver</option>
                <option value="conductor">Conductor</option>
              </select>
            </div>
            {formData.role === 'driver' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="License number"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingStaff(null)
                  setFormData({ name: '', phone: '', role: 'driver', license_number: '' })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={editingStaff ? handleUpdateStaff : handleAddStaff}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingStaff ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {staff.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No staff yet. Add your first staff member!</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  License Number
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
              {staff.map((staffMember) => (
                <tr key={staffMember.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {staffMember.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {staffMember.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{staffMember.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {staffMember.license_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        staffMember.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {staffMember.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(staffMember)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {staffMember.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleEdit(staffMember)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(staffMember.id)}
                        className="text-red-600 hover:text-red-900"
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
      )}
    </div>
  )
}

