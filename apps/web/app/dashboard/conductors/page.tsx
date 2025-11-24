'use client'

import { useEffect, useState } from 'react'

interface Staff {
  id: string
  name: string
  phone?: string | null
  role: 'driver' | 'conductor'
  is_active: boolean
}

export default function ConductorsPage() {
  const [conductors, setConductors] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingConductor, setEditingConductor] = useState<Staff | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'conductor' as 'driver' | 'conductor',
  })

  useEffect(() => {
    fetchConductors()
  }, [])

  async function fetchConductors() {
    setLoading(true)
    try {
      const response = await fetch('/api/transporter/staff?role=conductor')
      if (response.ok) {
        const data = await response.json()
        setConductors(data)
      }
    } catch (error) {
      console.error('Failed to fetch conductors:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddConductor() {
    if (!formData.name.trim()) return

    try {
      const response = await fetch('/api/transporter/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          role: 'conductor',
        }),
      })

      if (response.ok) {
        setFormData({ name: '', phone: '', role: 'conductor' })
        setShowAddForm(false)
        fetchConductors()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add conductor')
      }
    } catch (error) {
      console.error('Failed to add conductor:', error)
      alert('Failed to add conductor')
    }
  }

  function handleEdit(conductor: Staff) {
    setEditingConductor(conductor)
    setFormData({
      name: conductor.name,
      phone: conductor.phone || '',
      role: conductor.role,
    })
    setShowAddForm(false)
  }

  async function handleUpdateConductor() {
    if (!editingConductor || !formData.name.trim()) return

    try {
      const response = await fetch(`/api/transporter/staff/${editingConductor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          role: 'conductor',
          is_active: editingConductor.is_active,
        }),
      })

      if (response.ok) {
        setEditingConductor(null)
        setFormData({ name: '', phone: '', role: 'conductor' })
        fetchConductors()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update conductor')
      }
    } catch (error) {
      console.error('Failed to update conductor:', error)
      alert('Failed to update conductor')
    }
  }

  async function handleDelete(conductorId: string) {
    if (!confirm('Are you sure you want to delete this conductor?')) return

    try {
      const response = await fetch(`/api/transporter/staff/${conductorId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchConductors()
      }
    } catch (error) {
      console.error('Failed to delete conductor:', error)
    }
  }

  async function handleToggleActive(conductor: Staff) {
    try {
      const response = await fetch(`/api/transporter/staff/${conductor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: conductor.name,
          phone: conductor.phone,
          role: conductor.role,
          is_active: !conductor.is_active,
        }),
      })

      if (response.ok) {
        fetchConductors()
      }
    } catch (error) {
      console.error('Failed to update conductor:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Conductors</h1>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingConductor(null)
            setFormData({ name: '', phone: '', role: 'conductor' })
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          {showAddForm || editingConductor ? 'Cancel' : 'Add Conductor'}
        </button>
      </div>

      {(showAddForm || editingConductor) && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingConductor ? 'Edit Conductor' : 'Add New Conductor'}
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
                placeholder="Conductor name"
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
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingConductor(null)
                  setFormData({ name: '', phone: '', role: 'conductor' })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={editingConductor ? handleUpdateConductor : handleAddConductor}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingConductor ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {conductors.length === 0 ? (
        <p className="text-gray-500">No conductors yet. Add your first conductor!</p>
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
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {conductors.map((conductor) => (
                <tr key={conductor.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {conductor.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {conductor.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        conductor.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {conductor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(conductor)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {conductor.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleEdit(conductor)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(conductor.id)}
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

