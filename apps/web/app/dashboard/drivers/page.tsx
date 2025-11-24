'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Staff {
  id: string
  name: string
  phone?: string | null
  role: 'driver' | 'conductor'
  license_number?: string | null
  is_active: boolean
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Staff | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'driver' as 'driver' | 'conductor',
    license_number: '',
  })

  useEffect(() => {
    fetchDrivers()
  }, [])

  async function fetchDrivers() {
    setLoading(true)
    try {
      const response = await fetch('/api/transporter/staff?role=driver')
      if (response.ok) {
        const data = await response.json()
        setDrivers(data)
      }
    } catch (error) {
      console.error('Failed to fetch drivers:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddDriver() {
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
        fetchDrivers()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add driver')
      }
    } catch (error) {
      console.error('Failed to add driver:', error)
      alert('Failed to add driver')
    }
  }

  function handleEdit(driver: Staff) {
    setEditingDriver(driver)
    setFormData({
      name: driver.name,
      phone: driver.phone || '',
      role: driver.role,
      license_number: driver.license_number || '',
    })
    setShowAddForm(false)
  }

  async function handleUpdateDriver() {
    if (!editingDriver || !formData.name.trim()) return

    try {
      const response = await fetch(`/api/transporter/staff/${editingDriver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          role: formData.role,
          license_number: formData.role === 'driver' ? (formData.license_number || null) : null,
          is_active: editingDriver.is_active,
        }),
      })

      if (response.ok) {
        setEditingDriver(null)
        setFormData({ name: '', phone: '', role: 'driver', license_number: '' })
        fetchDrivers()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update driver')
      }
    } catch (error) {
      console.error('Failed to update driver:', error)
      alert('Failed to update driver')
    }
  }

  async function handleDelete(driverId: string) {
    if (!confirm('Are you sure you want to delete this driver?')) return

    try {
      const response = await fetch(`/api/transporter/staff/${driverId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDrivers()
      }
    } catch (error) {
      console.error('Failed to delete driver:', error)
    }
  }

  async function handleToggleActive(driver: Staff) {
    try {
      const response = await fetch(`/api/transporter/staff/${driver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: driver.name,
          phone: driver.phone,
          role: driver.role,
          license_number: driver.license_number,
          is_active: !driver.is_active,
        }),
      })

      if (response.ok) {
        fetchDrivers()
      }
    } catch (error) {
      console.error('Failed to update driver:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Drivers</h1>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingDriver(null)
            setFormData({ name: '', phone: '', role: 'driver', license_number: '' })
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          {showAddForm || editingDriver ? 'Cancel' : 'Add Driver'}
        </button>
      </div>

      {(showAddForm || editingDriver) && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingDriver ? 'Edit Driver' : 'Add New Driver'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Driver name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'driver' | 'conductor' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="driver">Driver</option>
                <option value="conductor">Conductor</option>
              </select>
            </div>
            {formData.role === 'driver' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="License number"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingDriver(null)
                  setFormData({ name: '', phone: '', role: 'driver', license_number: '' })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={editingDriver ? handleUpdateDriver : handleAddDriver}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingDriver ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {drivers.length === 0 ? (
        <p className="text-gray-500">No drivers yet. Add your first driver!</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  License Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {drivers.map((driver) => (
                <tr key={driver.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {driver.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {driver.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="capitalize">{driver.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {driver.license_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        driver.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {driver.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(driver)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {driver.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleEdit(driver)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(driver.id)}
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

