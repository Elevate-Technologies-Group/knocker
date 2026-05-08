import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents, useMap } from 'react-leaflet'
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
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function makeHouseDotIcon(address) {
  return L.divIcon({
    html: `<div style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.7);border:1.5px solid rgba(255,255,255,0.9);box-shadow:0 1px 4px rgba(0,0,0,0.6);cursor:pointer;"></div>`,
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

// Fetch nearby house addresses from OpenStreetMap Overpass API
async function fetchNearbyHouses(bounds) {
  const { _southWest: sw, _northEast: ne } = bounds
  const query = `
    [out:json][timeout:10];
    (
      node["addr:housenumber"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});
      way["addr:housenumber"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});
    );
    out center 200;
  `
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  })
  const data = await res.json()
  return data.elements.map(el => {
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    const tags = el.tags || {}
    const num = tags['addr:housenumber'] || ''
    const street = tags['addr:street'] || ''
    const city = tags['addr:city'] || ''
    const addr = [num, street, city].filter(Boolean).join(' ')
    return { lat, lng, address: addr || `${lat?.toFixed(5)}, ${lng?.toFixed(5)}` }
  }).filter(h => h.lat && h.lng)
}

// GPS blue dot component
function GpsMarker({ onLocationFound }) {
  const map = useMap()
  const markerRef = useRef(null)

  useEffect(() => {
    map.locate({ watch: true, enableHighAccuracy: true, setView: true, maxZoom: 18 })

    map.on('locationfound', (e) => {
      if (markerRef.current) markerRef.current.setLatLng(e.latlng)
      onLocationFound && onLocationFound(e.latlng)
    })

    return () => { map.stopLocate() }
  }, [map])

  const gpsIcon = L.divIcon({
    html: `
      <div style="position:relative;width:20px;height:20px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.25);animation:gps-pulse 2s infinite;"></div>
        <div style="position:absolute;inset:3px;border-radius:50%;background:#3b82f6;border:2.5px solid white;box-shadow:0 0 8px rgba(59,130,246,0.8);"></div>
      </div>
      <style>@keyframes gps-pulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(2.2);opacity:0}}</style>
    `,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })

  return <Marker ref={markerRef} position={[0, 0]} icon={gpsIcon} zIndexOffset={1000} />
}

// House dots layer — renders when zoom >= 17
function HouseDotsLayer({ doors, onHouseTap }) {
  const map = useMap()
  const [houses, setHouses] = useState([])
  const [zoom, setZoom] = useState(map.getZoom())
  const fetchTimeout = useRef(null)
  const loggedAddresses = new Set(doors.map(d => d.address))

  const fetchHouses = useCallback(async () => {
    const z = map.getZoom()
    if (z < 17) { setHouses([]); return }
    try {
      const bounds = map.getBounds()
      const results = await fetchNearbyHouses(bounds)
      setHouses(results)
    } catch (e) {
      console.warn('Overpass fetch failed', e)
    }
  }, [map])

  useMapEvents({
    moveend: () => {
      const z = map.getZoom()
      setZoom(z)
      clearTimeout(fetchTimeout.current)
      fetchTimeout.current = setTimeout(fetchHouses, 600)
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
    const isLogged = loggedAddresses.has(house.address)
    if (isLogged) return null // logged doors show their own colored pin
    return (
      <Marker
        key={`house-${i}`}
        position={[house.lat, house.lng]}
        icon={makeHouseDotIcon(house.address)}
        eventHandlers={{
          click: () => onHouseTap(house)
        }}
      />
    )
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
  const [mapCenter] = useState([33.4484, -112.0740])
  const [showTeam, setShowTeam] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
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
    const handler = (e) => setPanTarget(e.detail)
    window.addEventListener('knocker:panTo', handler)
    return () => window.removeEventListener('knocker:panTo', handler)
  }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Tapping a pre-loaded house dot
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

  // Tapping blank map area
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng
    setLoading(true)
    try {
      const [address, solar] = await Promise.all([
        reverseGeocode(lat, lng),
        getSolarData(lat, lng)
      ])
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
      showToast('❌ Failed to save', 'error')
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
        center={mapCenter}
        zoom={17}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        {/* Satellite base layer */}
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution="&copy; Google"
          maxZoom={22}
        />
        {/* Hybrid overlay: roads, labels, city names, state lines */}
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}"
          opacity={0.85}
          maxZoom={22}
        />

        <GpsMarker />
        <MapClickHandler onMapClick={handleMapClick} />
        <PanController target={panTarget} />

        {/* House dots from OSM (renders at zoom 17+) */}
        <HouseDotsLayer doors={doors} onHouseTap={handleHouseTap} />

        {/* Logged door pins */}
        {doors.map(door => (
          <Marker
            key={door.id}
            position={[door.lat, door.lng]}
            icon={makeDoorIcon(door.status)}
            eventHandlers={{ click: () => handleMarkerClick(door) }}
            zIndexOffset={500}
          />
        ))}

        {/* Pending pin */}
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

      <StatusLegend doors={doors} />
      {showTeam && <TeamPanel doors={doors} onClose={() => setShowTeam(false)} />}
      {showHistory && (
        <HistoryScreen
          repName={repName}
          onClose={() => setShowHistory(false)}
          onSelectDoor={(door) => {
            setShowHistory(false)
            handleMarkerClick(door)
          }}
        />
      )}

      {loading && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'rgba(15,23,42,0.9)', color: '#fff',
          padding: '12px 24px', borderRadius: 12, fontSize: 14,
          backdropFilter: 'blur(8px)', zIndex: 1000
        }}>Loading...</div>
      )}

      {toast && (
        <div style={{
          position: 'absolute', bottom: 100, left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#450a0a' : '#052e16',
          color: toast.type === 'error' ? '#fca5a5' : '#86efac',
          padding: '10px 20px', borderRadius: 10, fontSize: 14,
          border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#22c55e'}`,
          zIndex: 1000, whiteSpace: 'nowrap'
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
