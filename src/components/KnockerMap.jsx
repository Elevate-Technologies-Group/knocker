import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getDoors, subscribeToDoorsSession, reverseGeocode, getSolarData, logDoor } from '../lib/api'
import { DOOR_STATUSES, STATUS_ORDER } from '../lib/constants'
import DoorModal from './DoorModal'
import StatusLegend from './StatusLegend'
import TopBar from './TopBar'
import TeamPanel from './TeamPanel'
import HistoryScreen from './HistoryScreen'
import { getHomeownerInfo } from '../lib/api'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function makeDoorIcon(status) {
  const s = DOOR_STATUSES[status] || DOOR_STATUSES.no_answer
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${s.pinColor};border:2.5px solid white;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 8px ${s.pinColor}88;cursor:pointer;">${s.emoji}</div>`,
    className: '', iconSize: [28, 28], iconAnchor: [14, 14],
  })
}

function makeHouseDotIcon() {
  return L.divIcon({
    // Larger hollow ring — easy to tap, doesn't block the house underneath
    html: `<div style="
      width:38px;height:38px;border-radius:50%;
      background:rgba(99,102,241,0.18);
      border:3px solid rgba(255,255,255,0.95);
      box-shadow:0 0 8px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.4);
      cursor:pointer;
      box-sizing:border-box;
    "></div>`,
    className: '', iconSize: [38, 38], iconAnchor: [19, 19],
  })
}

async function fetchNearbyHouses(bounds) {
  const { _southWest: sw, _northEast: ne } = bounds
  const query = `[out:json][timeout:10];(node["addr:housenumber"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});way["addr:housenumber"](${sw.lat},${sw.lng},${ne.lat},${ne.lng}););out center 200;`
  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query })
  const data = await res.json()
  return data.elements.map(el => {
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    const t = el.tags || {}
    const addr = [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ')
    return { lat, lng, address: addr || `${lat?.toFixed(5)}, ${lng?.toFixed(5)}` }
  }).filter(h => h.lat && h.lng)
}

// GPS blue dot — auto-centers ONCE on first location, then lets user scroll freely
function GpsMarker() {
  const map = useMap()
  const markerRef = useRef(null)
  const hasCenteredRef = useRef(false)

  useEffect(() => {
    const gpsIcon = L.divIcon({
      html: `<div style="position:relative;width:20px;height:20px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.2);animation:gps-pulse 2s infinite;"></div>
        <div style="position:absolute;inset:3px;border-radius:50%;background:#3b82f6;border:2.5px solid white;box-shadow:0 0 8px rgba(59,130,246,0.8);"></div>
      </div>
      <style>@keyframes gps-pulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(2.5);opacity:0}}</style>`,
      className: '', iconSize: [20, 20], iconAnchor: [10, 10],
    })

    const marker = L.marker([0, 0], { icon: gpsIcon, zIndexOffset: 1000 })
    markerRef.current = marker

    map.locate({ watch: true, enableHighAccuracy: true })

    map.on('locationfound', (e) => {
      marker.setLatLng(e.latlng)
      if (!marker._map) marker.addTo(map)
      // Only pan to location on FIRST fix — after that user controls the map freely
      if (!hasCenteredRef.current) {
        map.setView(e.latlng, 18, { animate: true })
        hasCenteredRef.current = true
      }
    })

    return () => {
      map.stopLocate()
      marker.remove()
    }
  }, [map])

  return null
}

// House dots — loads when zoom >= 17, debounced 800ms after movement stops
function HouseDotsLayer({ doors, onHouseTap }) {
  const map = useMap()
  const [houses, setHouses] = useState([])
  const [zoom, setZoom] = useState(map.getZoom())
  const fetchTimeout = useRef(null)
  const loggedAddresses = new Set(doors.map(d => d.address))

  const fetchHouses = useCallback(async () => {
    if (map.getZoom() < 17) { setHouses([]); return }
    try {
      const results = await fetchNearbyHouses(map.getBounds())
      setHouses(results)
    } catch (e) { console.warn('Overpass error:', e) }
  }, [map])

  useMapEvents({
    moveend: () => {
      const z = map.getZoom()
      setZoom(z)
      if (z >= 17) {
        clearTimeout(fetchTimeout.current)
        // 800ms debounce — user must "settle" on an area before we load dots
        fetchTimeout.current = setTimeout(fetchHouses, 800)
      }
    },
    zoomend: () => {
      const z = map.getZoom()
      setZoom(z)
      if (z < 17) setHouses([])
      else {
        clearTimeout(fetchTimeout.current)
        fetchTimeout.current = setTimeout(fetchHouses, 400)
      }
    }
  })

  if (zoom < 17) return null

  return houses.map((house, i) => {
    if (loggedAddresses.has(house.address)) return null
    return (
      <Marker
        key={`h-${i}`}
        position={[house.lat, house.lng]}
        icon={makeHouseDotIcon()}
        eventHandlers={{ click: () => onHouseTap(house) }}
      />
    )
  })
}

function MapClickHandler({ onMapClick, disabled }) {
  useMapEvents({ click: disabled ? () => {} : onMapClick })
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
  const [showTeam, setShowTeam] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [toast, setToast] = useState(null)
  const [panTarget, setPanTarget] = useState(null)
  const modalOpen = !!(pendingPin || selectedDoor)

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
    const handler = (e) => setPanTarget(e.detail)
    window.addEventListener('knocker:panTo', handler)
    return () => window.removeEventListener('knocker:panTo', handler)
  }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleHouseTap = async (house) => {
    setLoading(true)
    try {
      const [solar, ownerInfo] = await Promise.all([
        getSolarData(house.lat, house.lng),
        getHomeownerInfo(house.lat, house.lng, house.address)
      ])
      setPendingPin({ ...house, solar, owner_name: ownerInfo?.owner || null })
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleMapClick = async (e) => {
    if (modalOpen) return
    const { lat, lng } = e.latlng
    setLoading(true)
    try {
      const [address, solar] = await Promise.all([reverseGeocode(lat, lng), getSolarData(lat, lng)])
      const ownerInfo = await getHomeownerInfo(lat, lng, address)
      setPendingPin({ lat, lng, address, solar, owner_name: ownerInfo?.owner || null })
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSaveDoor = async (doorData) => {
    try {
      await logDoor({ ...pendingPin, ...doorData, rep_name: repName, session_id: sessionId })
      setPendingPin(null)
      showToast(`✅ ${DOOR_STATUSES[doorData.status]?.label} saved`)
    } catch (err) {
      console.error('Save error:', err)
      showToast('❌ Failed to save: ' + (err.message || err.code || 'unknown'), 'error')
    }
  }

  const handleMarkerClick = async (door) => {
    setLoading(true)
    const solar = door.solar_data || await getSolarData(door.lat, door.lng).catch(() => null)
    setSelectedDoor({ ...door, solar })
    setLoading(false)
  }

  const handleUpdateDoor = async (doorData) => {
    try {
      await logDoor({
        lat: selectedDoor.lat, lng: selectedDoor.lng, address: selectedDoor.address,
        ...doorData, rep_name: repName, session_id: sessionId
      })
      setSelectedDoor(null)
      showToast('✅ Updated')
    } catch (err) {
      console.error('Update error:', err)
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
        onHistoryOpen={() => setShowHistory(true)}
      />

      <MapContainer
        center={[33.4484, -112.0740]}
        zoom={17}
        style={{ width: '100%', height: '100%' }}
        // zoom controls bottom-right so they don't show under modal
        zoomControl={false}
      >
        {/* Satellite + hybrid label overlay */}
        <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" attribution="&copy; Google" maxZoom={22} />
        <TileLayer url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}" opacity={0.85} maxZoom={22} />

        {/* Zoom control — bottom right, away from modal slide-up area */}
        <ZoomBottomRight />

        <GpsMarker />
        <MapClickHandler onMapClick={handleMapClick} disabled={modalOpen} />
        <PanController target={panTarget} />

        <HouseDotsLayer doors={doors} onHouseTap={handleHouseTap} />

        {doors.map(door => (
          <Marker
            key={door.id}
            position={[door.lat, door.lng]}
            icon={makeDoorIcon(door.status)}
            eventHandlers={{ click: () => handleMarkerClick(door) }}
            zIndexOffset={500}
          />
        ))}

        {pendingPin && (
          <Marker
            position={[pendingPin.lat, pendingPin.lng]}
            icon={L.divIcon({
              html: `<div style="width:26px;height:26px;border-radius:50%;background:#fff;border:3px solid #6366f1;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.5)">+</div>`,
              className: '', iconSize: [26, 26], iconAnchor: [13, 13]
            })}
          />
        )}
      </MapContainer>

      {/* Status legend — bottom left */}
      <StatusLegend doors={doors} />

      {/* Overlays */}
      {showTeam && <TeamPanel doors={doors} onClose={() => setShowTeam(false)} />}
      {showHistory && (
        <HistoryScreen
          repName={repName}
          onClose={() => setShowHistory(false)}
          onSelectDoor={(door) => { setShowHistory(false); handleMarkerClick(door) }}
        />
      )}

      {loading && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: 'rgba(15,23,42,0.9)', color: '#fff',
          padding: '12px 24px', borderRadius: 12, fontSize: 14,
          backdropFilter: 'blur(8px)', zIndex: 1000, pointerEvents: 'none'
        }}>Loading...</div>
      )}

      {toast && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#450a0a' : '#052e16',
          color: toast.type === 'error' ? '#fca5a5' : '#86efac',
          padding: '10px 20px', borderRadius: 10, fontSize: 14,
          border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#22c55e'}`,
          zIndex: 1000, whiteSpace: 'nowrap', maxWidth: '90vw',
          overflow: 'hidden', textOverflow: 'ellipsis'
        }}>{toast.msg}</div>
      )}

      {pendingPin && (
        <DoorModal door={pendingPin} mode="create" onSave={handleSaveDoor} onClose={() => setPendingPin(null)} />
      )}
      {selectedDoor && (
        <DoorModal door={selectedDoor} mode="edit" onSave={handleUpdateDoor} onClose={() => setSelectedDoor(null)} />
      )}
    </div>
  )
}

// Zoom control placed bottom-right so it's never under the modal slide-up
function ZoomBottomRight() {
  const map = useMap()
  useEffect(() => {
    const ctrl = L.control.zoom({ position: 'bottomright' })
    ctrl.addTo(map)
    return () => ctrl.remove()
  }, [map])
  return null
}
