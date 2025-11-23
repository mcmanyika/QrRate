'use client'

import { useEffect, useState } from 'react'
import VehicleCard from '@/components/dashboard/VehicleCard'
import Pagination from '@/components/dashboard/Pagination'

interface Vehicle {
  id: string
  reg_number: string
  is_active: boolean
  qr_code_svg?: string | null
  route?: {
    name: string
  } | null
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRegNumber, setNewRegNumber] = useState('')
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [claimRegNumber, setClaimRegNumber] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 4,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    fetchVehicles()
  }, [currentPage])

  async function fetchVehicles() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '4',
      })
      const response = await fetch(`/api/transporter/vehicles?${params}`)
      if (response.ok) {
        const result = await response.json()
        setVehicles(result.data || [])
        setPagination(result.pagination || pagination)
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error)
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Vehicles</h1>
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
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2">Claim Existing Vehicle</h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter the registration number of an existing vehicle to link it to your account.
          </p>
          <div className="flex gap-4">
            <input
              type="text"
              value={claimRegNumber}
              onChange={(e) => setClaimRegNumber(e.target.value)}
              placeholder="Registration Number (e.g., abc1234)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
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
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={newRegNumber}
              onChange={(e) => setNewRegNumber(e.target.value)}
              placeholder="Registration Number"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
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

      {vehicles.length === 0 ? (
        <p className="text-gray-500">No vehicles yet. Add your first vehicle!</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onGenerateQR={handleGenerateQR}
                onDelete={handleDelete}
              />
            ))}
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
          />
        </>
      )}
    </div>
  )
}

