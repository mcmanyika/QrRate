'use client'

interface VehicleCardProps {
  vehicle: {
    id: string
    reg_number: string
    is_active: boolean
    qr_code_svg?: string | null
    driver?: {
      id: string
      name: string
    } | null
    conductor?: {
      id: string
      name: string
    } | null
    route?: {
      name: string
    } | null
  }
  onGenerateQR?: (vehicleId: string) => void
  onEdit?: (vehicleId: string) => void
  onDelete?: (vehicleId: string) => void
}

function downloadQRCode(svgString: string, filename: string) {
  // Create a temporary canvas to convert SVG to PNG
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = new Image()
  
  // Convert SVG to data URL
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  
  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    if (ctx) {
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = `${filename}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(downloadUrl)
        }
        URL.revokeObjectURL(url)
      })
    }
  }
  
  img.onerror = () => {
    URL.revokeObjectURL(url)
    // Fallback: download as SVG
    const link = document.createElement('a')
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
    const svgUrl = URL.createObjectURL(svgBlob)
    link.href = svgUrl
    link.download = `${filename}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(svgUrl)
  }
  
  img.src = url
}

export default function VehicleCard({ vehicle, onGenerateQR, onEdit, onDelete }: VehicleCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">{vehicle.reg_number}</h3>
            {vehicle.route && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Route: {vehicle.route.name}</p>
            )}
            {vehicle.driver && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Driver: {vehicle.driver.name}</p>
            )}
            {vehicle.conductor && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Conductor: {vehicle.conductor.name}</p>
            )}
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  vehicle.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {vehicle.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="ml-4 flex flex-col gap-2 flex-shrink-0">
            {onGenerateQR && (
              <button
                onClick={() => onGenerateQR(vehicle.id)}
                className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
              >
                Generate QR
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(vehicle.id)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(vehicle.id)}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 whitespace-nowrap"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        {vehicle.qr_code_svg && (
          <div className="mt-4">
            <div className="flex justify-center mb-2">
              <div className="max-w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: vehicle.qr_code_svg }} />
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => downloadQRCode(vehicle.qr_code_svg!, vehicle.reg_number)}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Download QR Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

