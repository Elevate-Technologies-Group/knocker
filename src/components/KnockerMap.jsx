import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getDoors, subscribeToDoorsSession, reverseGeocode, getSolarData, logDoor } from '../lib/api'
import { DOOR_STATUSES, STATUS_ORDER } from '../lib/constants'
import DoorModal from './DoorModal'
import StatusLegend from './StatusLegend'
import TopBar from './TopBar'
import TeamPanel from './TeamPanel'

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function makeIcon(status) {
  const s = DOOR_STATUSES[status] || DOOR_STATUSES.no_answer
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="12" fill="${s.pinColor}" stroke="white" stroke-width="2.5"
        style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
      <text x="14" y="19" text-anchor="middle" font-size="12">${s.emoji}</text>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16]
  })
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: onMapClick })
  return null
}

function PanController({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], 18, { animate: true })
  }, [target, map])
  return null
}

export default function KnockerMap({ repName, sessionId }) {
  const [doors, setDoors] = useState([])
  const [selectedDoor, setSelectedDoor] = useState(null)
  const [pendingPin, setPendingPin] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState([33.4484, -112.0740])
  const [showTeam, setShowTeam] = useState(false)
  const [toast, setToast] = useState(null)
  const [panTarget, setPanTarget] = useState(null)

  useEffect(() => {
    getDoors(sessionId).then(setDoors).catch(console.error)
  }, [sessionId])

  useEffect(() => {
    const channel = subscribeToDoorsSession(sessionId, (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload
      setDoors(prev => {
        if (eventType === 'INSERT') return [...prev, newRow]
        if (eventType === 'UPDATE') return prev.map(d => d.id === newRow.id ? newRow : d)
        if (eventType === 'DELETE') return prev.filter(d => d.id !== oldRow.id)
        return prev
      })
    })
    return () => channel.unsubscribe()
  }, [sessionId])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      )
    }
    // Listen for address search pan events from TopBar
    const handler = (e) => setPanTarget(e.detail)
    window.addEventListener('knocker:panTo', handler)
    return () => window.removeEventListener('knocker:panTo', handler)
  }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng
    setLoading(true)
    try {
      const [address, solar] = await Promise.all([
        reverseGeocode(lat, lng),
        getSolarData(lat, lng)
      ])
      setPendingPin({ lat, lng, address, solar })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleSaveDoor = async (doorData) => {
    try {
      await logDoor({
        ...pendingPin,
        ...doorData,
        rep_name: repName,
        session_id: sessionId
      })
      setPendingPin(null)
      showToast(`✅ ${DOOR_STATUSES[doorData.status]?.label} saved`)
    } catch (err) {
      console.error(err)
      showToast('❌ Failed to save', 'error')
    }
  }

  const handleMarkerClick = async (door) => {
    setLoading(true)
    let solar = door.solar_data
    if (!solar) solar = await getSolarData(door.lat, door.lng).catch(() => null)
    setSelectedDoor({ ...door, solar })
    setLoading(false)
  }

  const handleUpdateDoor = async (doorData) => {
    try {
      await logDoor({
        lat: selectedDoor.lat,
        lng: selectedDoor.lng,
        address: selectedDoor.address,
        ...doorData,
        rep_name: repName,
        session_id: sessionId
      })
      setSelectedDoor(null)
      showToast('✅ Updated')
    } catch (err) {
      showToast('❌ Failed to update', 'error')
    }
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', background: '#0f172a' }}>
      <TopBar
        repName={repName}
        sessionId={sessionId}
        doorCount={doors.length}
        onTeamToggle={() => setShowTeam(s => !s)}
      />

      <MapContainer
        center={mapCenter}
        zoom={17}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        {/* Satellite tiles */}
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution="&copy; Google"
          maxZoom={22}
        />

        <MapClickHandler onMapClick={handleMapClick} />
        <PanController target={panTarget} />

        {doors.map(door => (
          <Marker
            key={door.id}
            position={[door.lat, door.lng]}
            icon={makeIcon(door.status)}
            eventHandlers={{ click: () => handleMarkerClick(door) }}
          />
        ))}

        {pendingPin && (
          <Marker
            position={[pendingPin.lat, pendingPin.lng]}
            icon={L.divIcon({
              html: `<div style="width:26px;height:26px;border-radius:50%;background:#fff;border:3px solid #6366f1;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.5)">+</div>`,
              className: '',
              iconSize: [26, 26],
              iconAnchor: [13, 13]
            })}
          />
        )}
      </MapContainer>

      <StatusLegend doors={doors} />

      {showTeam && <TeamPanel doors={doors} onClose={() => setShowTeam(false)} />}

      {loading && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'rgba(15,23,42,0.9)', color: '#fff',
          padding: '12px 24px', borderRadius: 12,
          fontSize: 14, backdropFilter: 'blur(8px)', zIndex: 1000
        }}>
          Loading...
        </div>
      )}

      {toast && (
        <div style={{
          position: 'absolute', bottom: 100, left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#450a0a' : '#052e16',
          color: toast.type === 'error' ? '#fca5a5' : '#86efac',
          padding: '10px 20px', borderRadius: 10,
          fontSize: 14, border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#22c55e'}`,
          zIndex: 1000, whiteSpace: 'nowrap'
        }}>
          {toast.msg}
        </div>
      )}

      {pendingPin && (
        <DoorModal
          door={pendingPin}
          mode="create"
          onSave={handleSaveDoor}
          onClose={() => setPendingPin(null)}
        />
      )}

      {selectedDoor && (
        <DoorModal
          door={selectedDoor}
          mode="edit"
          onSave={handleUpdateDoor}
          onClose={() => setSelectedDoor(null)}
        />
      )}
    </div>
  )
}
