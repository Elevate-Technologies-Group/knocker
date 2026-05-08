import { useState, useEffect, useRef } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { getDoors, subscribeToDoorsSession, reverseGeocode, getSolarData, logDoor } from '../lib/api'
import { DOOR_STATUSES, STATUS_ORDER } from '../lib/constants'
import DoorModal from './DoorModal'
import StatusLegend from './StatusLegend'
import TopBar from './TopBar'
import TeamPanel from './TeamPanel'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

export default function KnockerMap({ repName, sessionId }) {
  const [doors, setDoors] = useState([])
  const [selectedDoor, setSelectedDoor] = useState(null)
  const [pendingPin, setPendingPin] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState({ lat: 33.4484, lng: -112.0740 })
  const [showTeam, setShowTeam] = useState(false)
  const [toast, setToast] = useState(null)

  // Load initial doors
  useEffect(() => {
    getDoors(sessionId).then(setDoors).catch(console.error)
  }, [sessionId])

  // Real-time subscription
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

  // GPS center on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // fallback to Phoenix
      )
    }
  }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleMapClick = async (e) => {
    const lat = e.detail.latLng.lat
    const lng = e.detail.latLng.lng
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
      const saved = await logDoor({
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
    if (!solar) {
      solar = await getSolarData(door.lat, door.lng).catch(() => null)
    }
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
      showToast(`✅ Updated`)
    } catch (err) {
      showToast('❌ Failed to update', 'error')
    }
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', background: '#0f172a' }}>
      <APIProvider apiKey={MAPS_KEY}>
        <TopBar
          repName={repName}
          sessionId={sessionId}
          doorCount={doors.length}
          onTeamToggle={() => setShowTeam(s => !s)}
        />

        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={mapCenter}
          defaultZoom={16}
          mapId="knocker-map"
          mapTypeId="satellite"
          tilt={0}
          gestureHandling="greedy"
          disableDefaultUI={false}
          onClick={handleMapClick}
          clickableIcons={false}
        >
          {doors.map(door => (
            <DoorMarker
              key={door.id}
              door={door}
              onClick={() => handleMarkerClick(door)}
            />
          ))}

          {pendingPin && (
            <AdvancedMarker position={{ lat: pendingPin.lat, lng: pendingPin.lng }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#fff', border: '3px solid #6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
              }}>+</div>
            </AdvancedMarker>
          )}
        </Map>

        <StatusLegend doors={doors} />

        {showTeam && (
          <TeamPanel doors={doors} onClose={() => setShowTeam(false)} />
        )}

        {loading && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            background: 'rgba(15,23,42,0.9)', color: '#fff',
            padding: '12px 24px', borderRadius: 12,
            fontSize: 14, backdropFilter: 'blur(8px)'
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
      </APIProvider>
    </div>
  )
}

function DoorMarker({ door, onClick }) {
  const status = DOOR_STATUSES[door.status] || DOOR_STATUSES.no_answer
  return (
    <AdvancedMarker position={{ lat: door.lat, lng: door.lng }} onClick={onClick}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: status.pinColor,
        border: '2px solid rgba(255,255,255,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, cursor: 'pointer',
        boxShadow: `0 0 8px ${status.pinColor}88`,
        transition: 'transform 0.15s',
      }}
        title={`${status.label} — ${door.address}`}
      >
        {status.emoji}
      </div>
    </AdvancedMarker>
  )
}
