'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'

interface ServiceProvider {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  service_type: 'maintenance' | 'fuel_supplier' | 'general'
  address?: string | null
  contact_person?: string | null
  is_active: boolean
  vehicle_count?: number
}

export default function ServiceProvidersPage() {
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null)
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | 'maintenance' | 'fuel_supplier' | 'general'>('all')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    service_type: 'maintenance' as 'maintenance' | 'fuel_supplier' | 'general',
    address: '',
    contact_person: '',
  })

  useEffect(() => {
    fetchServiceProviders()
  }, [serviceTypeFilter])

  async function fetchServiceProviders() {
    setLoading(true)
    try {
      const url = serviceTypeFilter === 'all' 
        ? '/api/transporter/service-providers'
        : `/api/transporter/service-providers?service_type=${serviceTypeFilter}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setServiceProviders(data)
      }
    } catch (error) {
      console.error('Failed to fetch service providers:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddServiceProvider() {
    if (!formData.name.trim()) return

    try {
      const response = await fetch('/api/transporter/service-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          service_type: formData.service_type,
          address: formData.address || null,
          contact_person: formData.contact_person || null,
        }),
      })

      if (response.ok) {
        setFormData({ name: '', phone: '', email: '', service_type: 'maintenance', address: '', contact_person: '' })
        setShowAddForm(false)
        fetchServiceProviders()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add service provider')
      }
    } catch (error) {
      console.error('Failed to add service provider:', error)
      alert('Failed to add service provider')
    }
  }

  function handleEdit(provider: ServiceProvider) {
    setEditingProvider(provider)
    setFormData({
      name: provider.name,
      phone: provider.phone || '',
      email: provider.email || '',
      service_type: provider.service_type,
      address: provider.address || '',
      contact_person: provider.contact_person || '',
    })
    setShowAddForm(false)
  }

  async function handleUpdateServiceProvider() {
    if (!editingProvider || !formData.name.trim()) return

    try {
      const response = await fetch(`/api/transporter/service-providers/${editingProvider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          service_type: formData.service_type,
          address: formData.address || null,
          contact_person: formData.contact_person || null,
          is_active: editingProvider.is_active,
        }),
      })

      if (response.ok) {
        setEditingProvider(null)
        setFormData({ name: '', phone: '', email: '', service_type: 'maintenance', address: '', contact_person: '' })
        fetchServiceProviders()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update service provider')
      }
    } catch (error) {
      console.error('Failed to update service provider:', error)
      alert('Failed to update service provider')
    }
  }

  async function handleDelete(providerId: string) {
    if (!confirm('Are you sure you want to delete this service provider?')) return

    try {
      const response = await fetch(`/api/transporter/service-providers/${providerId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchServiceProviders()
      }
    } catch (error) {
      console.error('Failed to delete service provider:', error)
    }
  }

  async function handleToggleActive(provider: ServiceProvider) {
    try {
      const response = await fetch(`/api/transporter/service-providers/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: provider.name,
          phone: provider.phone,
          email: provider.email,
          service_type: provider.service_type,
          address: provider.address,
          contact_person: provider.contact_person,
          is_active: !provider.is_active,
        }),
      })

      if (response.ok) {
        fetchServiceProviders()
      }
    } catch (error) {
      console.error('Failed to update service provider:', error)
    }
  }

  function getServiceTypeLabel(type: string) {
    switch (type) {
      case 'maintenance':
        return 'Maintenance'
      case 'fuel_supplier':
        return 'Fuel Supplier'
      case 'general':
        return 'General'
      default:
        return type
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Service Providers</h1>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingProvider(null)
            setFormData({ name: '', phone: '', email: '', service_type: 'maintenance', address: '', contact_person: '' })
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          {showAddForm || editingProvider ? 'Cancel' : 'Add Service Provider'}
        </button>
      </div>

      {/* Service Type Filter */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setServiceTypeFilter('all')}
          className={`px-4 py-2 rounded-md ${
            serviceTypeFilter === 'all'
              ? 'bg-blue-600 text-white dark:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setServiceTypeFilter('maintenance')}
          className={`px-4 py-2 rounded-md ${
            serviceTypeFilter === 'maintenance'
              ? 'bg-blue-600 text-white dark:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Maintenance
        </button>
        <button
          onClick={() => setServiceTypeFilter('fuel_supplier')}
          className={`px-4 py-2 rounded-md ${
            serviceTypeFilter === 'fuel_supplier'
              ? 'bg-blue-600 text-white dark:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Fuel Supplier
        </button>
        <button
          onClick={() => setServiceTypeFilter('general')}
          className={`px-4 py-2 rounded-md ${
            serviceTypeFilter === 'general'
              ? 'bg-blue-600 text-white dark:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          General
        </button>
      </div>

      {(showAddForm || editingProvider) && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {editingProvider ? 'Edit Service Provider' : 'Add New Service Provider'}
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
                placeholder="Service provider name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Email address"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Service Type *
              </label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value as 'maintenance' | 'fuel_supplier' | 'general' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="maintenance">Maintenance</option>
                <option value="fuel_supplier">Fuel Supplier</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Address"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Contact person name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingProvider(null)
                  setFormData({ name: '', phone: '', email: '', service_type: 'maintenance', address: '', contact_person: '' })
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={editingProvider ? handleUpdateServiceProvider : handleAddServiceProvider}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                {editingProvider ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {serviceProviders.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No service providers yet. Add your first service provider!</p>
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
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Service Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Contact Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Vehicles
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
              {serviceProviders.map((provider) => (
                <tr key={provider.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {provider.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {provider.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {provider.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{getServiceTypeLabel(provider.service_type)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {provider.contact_person || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {provider.vehicle_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        provider.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {provider.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(provider)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {provider.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleEdit(provider)}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id)}
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
      )}
    </div>
  )
}

