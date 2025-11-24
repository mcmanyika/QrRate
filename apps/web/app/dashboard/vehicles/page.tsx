'use client'

import { useEffect, useState } from 'react'
import VehicleCard from '@/components/dashboard/VehicleCard'
import Pagination from '@/components/dashboard/Pagination'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Vehicle {
  id: string
  reg_number: string
  is_active: boolean
  qr_code_svg?: string | null
  route_id?: string | null
  driver_staff_id?: string | null
  conductor_staff_id?: string | null
  route?: {
    id: string
    name: string
    code: string
  } | null
  driver?: {
    id: string
    name: string
  } | null
  conductor?: {
    id: string
    name: string
  } | null
}

interface Route {
  id: string
  name: string
  code: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRegNumber, setNewRegNumber] = useState('')
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [claimRegNumber, setClaimRegNumber] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 3,
    total: 0,
    totalPages: 0,
  })
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('')
  const [routes, setRoutes] = useState<Route[]>([])
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [editFormData, setEditFormData] = useState({
    reg_number: '',
    route_id: '',
    is_active: true,
    driver_staff_id: '',
    conductor_staff_id: '',
  })
  const [drivers, setDrivers] = useState<any[]>([])
  const [conductors, setConductors] = useState<any[]>([])

  useEffect(() => {
    fetchVehicles()
    fetchRoutes()
    fetchDrivers()
    fetchConductors()
  }, [currentPage])

  async function fetchDrivers() {
    try {
      const response = await fetch('/api/transporter/staff?role=driver')
      if (response.ok) {
        const data = await response.json()
        setDrivers(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch drivers:', error)
    }
  }

  async function fetchConductors() {
    try {
      const response = await fetch('/api/transporter/staff?role=conductor')
      if (response.ok) {
        const data = await response.json()
        setConductors(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch conductors:', error)
    }
  }

  useEffect(() => {
    if (allVehicles.length > 0) {
      filterVehicles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedRouteFilter, allVehicles, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedRouteFilter])

  async function fetchVehicles() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '1000', // Fetch all for filtering
      })
      const response = await fetch(`/api/transporter/vehicles?${params}`)
      if (response.ok) {
        const result = await response.json()
        const fetchedVehicles = result.data || []
        setAllVehicles(fetchedVehicles)
        // Set pagination based on total count with limit of 3
        setPagination({
          page: currentPage,
          limit: 3,
          total: fetchedVehicles.length,
          totalPages: Math.ceil(fetchedVehicles.length / 3),
        })
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRoutes() {
    try {
      const response = await fetch('/api/routes')
      if (response.ok) {
        const data = await response.json()
        setRoutes(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch routes:', error)
    }
  }


  function filterVehicles() {
    if (allVehicles.length === 0) {
      setVehicles([])
      return
    }

    let filtered = [...allVehicles]

    // Filter by search query (registration number)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((vehicle) =>
        vehicle.reg_number.toLowerCase().includes(query)
      )
    }

    // Filter by route
    if (selectedRouteFilter) {
      filtered = filtered.filter(
        (vehicle) => vehicle.route_id === selectedRouteFilter
      )
    }

    // Calculate pagination
    const filteredTotal = filtered.length
    const filteredTotalPages = Math.ceil(filteredTotal / pagination.limit)
    const pageToUse = filteredTotalPages > 0 && currentPage > filteredTotalPages ? 1 : currentPage

    // Apply pagination
    const startIndex = (pageToUse - 1) * pagination.limit
    const endIndex = startIndex + pagination.limit
    const paginatedVehicles = filtered.slice(startIndex, endIndex)

    setVehicles(paginatedVehicles)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleAddVehicle() {
    if (!newRegNumber.trim()) return

    try {
      const response = await fetch('/api/transporter/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg_number: newRegNumber }),
      })

      if (response.ok) {
        setNewRegNumber('')
        setShowAddForm(false)
        setCurrentPage(1) // Reset to first page after adding
        fetchVehicles()
      }
    } catch (error) {
      console.error('Failed to add vehicle:', error)
    }
  }

  async function handleGenerateQR(vehicleId: string) {
    try {
      const response = await fetch('/api/transporter/qr-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicleId }),
      })

      if (response.ok) {
        fetchVehicles()
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    }
  }

  async function handleDelete(vehicleId: string) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return

    try {
      const response = await fetch(`/api/transporter/vehicles/${vehicleId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchVehicles()
      }
    } catch (error) {
      console.error('Failed to delete vehicle:', error)
    }
  }

  async function handleClaimVehicle() {
    if (!claimRegNumber.trim()) return

    try {
      const response = await fetch('/api/transporter/vehicles/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg_number: claimRegNumber.trim().toUpperCase() }),
      })

      if (response.ok) {
        setClaimRegNumber('')
        setShowClaimForm(false)
        setCurrentPage(1) // Reset to first page after claiming
        fetchVehicles()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to claim vehicle')
      }
    } catch (error) {
      console.error('Failed to claim vehicle:', error)
      alert('Failed to claim vehicle')
    }
  }

  function handleEdit(vehicleId: string) {
    const vehicle = allVehicles.find((v) => v.id === vehicleId)
    if (vehicle) {
      setEditingVehicle(vehicle)
      setEditFormData({
        reg_number: vehicle.reg_number,
        route_id: vehicle.route_id || '',
        is_active: vehicle.is_active,
        driver_staff_id: vehicle.driver_staff_id || '',
        conductor_staff_id: vehicle.conductor_staff_id || '',
      })
    }
  }

  async function handleSaveEdit() {
    if (!editingVehicle || !editFormData.reg_number.trim()) return

    try {
      const response = await fetch(`/api/transporter/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reg_number: editFormData.reg_number.trim(),
          route_id: editFormData.route_id || null,
          is_active: editFormData.is_active,
          driver_staff_id: editFormData.driver_staff_id || null,
          conductor_staff_id: editFormData.conductor_staff_id || null,
        }),
      })

      if (response.ok) {
        setEditingVehicle(null)
        fetchVehicles()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update vehicle')
      }
    } catch (error) {
      console.error('Failed to update vehicle:', error)
      alert('Failed to update vehicle')
    }
  }

  function handleClearFilters() {
    setSearchQuery('')
    setSelectedRouteFilter('')
    setCurrentPage(1)
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Vehicles</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowClaimForm(!showClaimForm)
              setShowAddForm(false)
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            {showClaimForm ? 'Cancel' : 'Claim Vehicle'}
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm)
              setShowClaimForm(false)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            {showAddForm ? 'Cancel' : 'Add Vehicle'}
          </button>
        </div>
      </div>

      {showClaimForm && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">Claim Existing Vehicle</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Enter the registration number of an existing vehicle to link it to your account.
          </p>
          <div className="flex gap-4">
            <input
              type="text"
              value={claimRegNumber}
              onChange={(e) => setClaimRegNumber(e.target.value)}
              placeholder="Registration Number (e.g., abc1234)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              onClick={handleClaimVehicle}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Claim
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={newRegNumber}
              onChange={(e) => setNewRegNumber(e.target.value)}
              placeholder="Registration Number"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              onClick={handleAddVehicle}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by registration number..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="md:w-64">
            <select
              value={selectedRouteFilter}
              onChange={(e) => {
                setSelectedRouteFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">All Routes</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>
          {(searchQuery || selectedRouteFilter) && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {allVehicles.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No vehicles yet. Add your first vehicle!</p>
      ) : (
        <>
          {vehicles.length === 0 ? (
            <p className="text-gray-500">
              {searchQuery || selectedRouteFilter
                ? 'No vehicles found matching your filters.'
                : 'No vehicles yet. Add your first vehicle!'}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onGenerateQR={handleGenerateQR}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
              {(() => {
                // Calculate filtered vehicles count
                const filteredCount = allVehicles.filter((v) => {
                  const matchesSearch = !searchQuery.trim() || 
                    v.reg_number.toLowerCase().includes(searchQuery.toLowerCase())
                  const matchesRoute = !selectedRouteFilter || v.route_id === selectedRouteFilter
                  return matchesSearch && matchesRoute
                }).length
                
                const filteredTotalPages = Math.ceil(filteredCount / pagination.limit)
                
                // Show pagination if there are vehicles
                if (filteredCount > 0) {
                  return (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={filteredTotalPages}
                      onPageChange={handlePageChange}
                      totalItems={filteredCount}
                      itemsPerPage={pagination.limit}
                    />
                  )
                }
                return null
              })()}
            </>
          )}
        </>
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setEditingVehicle(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Vehicle</h3>
                <button
                  onClick={() => setEditingVehicle(null)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.reg_number}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, reg_number: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Registration Number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Route
                  </label>
                  <select
                    value={editFormData.route_id}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, route_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">No Route</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Driver
                  </label>
                  <select
                    value={editFormData.driver_staff_id}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, driver_staff_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">No Driver</option>
                    {drivers.filter((d: any) => d.is_active).map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Conductor
                  </label>
                  <select
                    value={editFormData.conductor_staff_id}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, conductor_staff_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">No Conductor</option>
                    {conductors.filter((c: any) => c.is_active).map((conductor) => (
                      <option key={conductor.id} value={conductor.id}>
                        {conductor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editFormData.is_active}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, is_active: e.target.checked })
                      }
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Active
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

