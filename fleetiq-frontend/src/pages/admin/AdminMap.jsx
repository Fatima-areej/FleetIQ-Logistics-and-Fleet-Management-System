import { useEffect, useState } from 'react';
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import API from '../../api/axios';
import { T } from '../../styles/theme';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const makeIcon = (emoji, color) => new L.DivIcon({
    html: `<div style="
        background:${color};
        width:34px;height:34px;border-radius:10px;
        display:flex;align-items:center;justify-content:center;
        font-size:16px;
        box-shadow:0 0 0 2px #fff,0 4px 14px rgba(15,23,42,0.18);
        border:1.5px solid rgba(15,23,42,0.12);
        backdrop-filter:blur(4px);
    ">${emoji}</div>`,
    className: '', iconSize: [34, 34], iconAnchor: [17, 17],
});

const warehouseIcon = makeIcon('🏭', '#4F46E5');
const vehicleAvailIcon = makeIcon('🚗', '#059669');
const vehicleInUseIcon = makeIcon('🚚', '#D97706');
const vehicleMaintIcon = makeIcon('🔧', '#DC2626');
const shipmentIcon     = makeIcon('📦', '#0284C7');

export default function AdminMap() {
    const [mapData,      setMapData]      = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [showWh,       setShowWh]       = useState(true);
    const [showVeh,      setShowVeh]      = useState(true);
    const [showShip,     setShowShip]     = useState(true);
    const [showHeatmap,  setShowHeatmap]  = useState(false);
    const [heatmapData,  setHeatmapData]  = useState([]);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            API.get('/geo/map-data'),
            API.get('/analytics/delivery-heatmap'),
        ])
            .then(([mapRes, hmRes]) => {
                setMapData(mapRes.data);
                setHeatmapData(hmRes.data || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const counts = {
        warehouses: mapData?.warehouses?.length || 0,
        vehicles:   mapData?.vehicles?.length   || 0,
        shipments:  mapData?.shipments?.length  || 0,
        heatmap:    heatmapData.length,
    };

    const maxHeatCount = heatmapData.length
        ? Math.max(...heatmapData.map(h => h.delivery_count))
        : 1;

    const getVehicleIcon = (status) =>
        status === 'available'   ? vehicleAvailIcon :
        status === 'maintenance' ? vehicleMaintIcon :
        vehicleInUseIcon;

    return (
        <div style={{
            animation: 'fadeIn 0.2s ease',
            height: 'calc(100vh - 112px)',
            display: 'flex', flexDirection: 'column', gap: 12,
        }}>
            <style>{`
                .leaflet-container {
                    background: ${T.inputBg} !important;
                    font-family: ${T.fontBody} !important;
                }
                .leaflet-popup-content-wrapper {
                    background: ${T.cardBg} !important;
                    border: 1px solid ${T.border} !important;
                    border-radius: 12px !important;
                    box-shadow: ${T.shadowLg} !important;
                    color: ${T.textPri} !important;
                    padding: 0 !important;
                }
                .leaflet-popup-content {
                    margin: 0 !important;
                    font-family: ${T.fontBody} !important;
                }
                .leaflet-popup-tip {
                    background: ${T.cardBg} !important;
                    box-shadow: none !important;
                }
                .leaflet-popup-close-button {
                    color: ${T.textMuted} !important;
                    font-size: 18px !important;
                    top: 8px !important;
                    right: 8px !important;
                }
                .leaflet-popup-close-button:hover { color: ${T.textPri} !important; }
                .leaflet-control-zoom {
                    border: 1px solid ${T.border} !important;
                    border-radius: 10px !important;
                    overflow: hidden;
                    box-shadow: ${T.shadowMd};
                }
                .leaflet-control-zoom a {
                    background: ${T.cardBg} !important;
                    color: ${T.textSec} !important;
                    border-bottom: 1px solid ${T.border} !important;
                    width: 32px !important; height: 32px !important;
                    line-height: 32px !important;
                }
                .leaflet-control-zoom a:hover {
                    background: ${T.accentLight} !important;
                    color: ${T.accent} !important;
                }
                .leaflet-attribution-flag { display: none !important; }
                .leaflet-control-attribution {
                    background: rgba(255,255,255,0.88) !important;
                    color: ${T.textMuted} !important;
                    font-size: 9px !important;
                    border-radius: 6px !important;
                    border: 1px solid ${T.border} !important;
                }
                .leaflet-control-attribution a { color: ${T.textSec} !important; }
            `}</style>

            {/* ── CONTROL BAR ── */}
            <div style={{
                display: 'flex', gap: 8, alignItems: 'center',
                flexWrap: 'wrap',
            }}>
                {/* layer toggles */}
                {[
                    { key: 'wh',   label: 'Warehouses', count: counts.warehouses,
                      color: '#4F46E5', val: showWh,      set: setShowWh      },
                    { key: 'veh',  label: 'Vehicles',   count: counts.vehicles,
                      color: '#D97706', val: showVeh,     set: setShowVeh     },
                    { key: 'ship', label: 'Shipments',  count: counts.shipments,
                      color: '#0284C7', val: showShip,    set: setShowShip    },
                    { key: 'heat', label: 'Density',    count: counts.heatmap,
                      color: '#DC2626', val: showHeatmap, set: setShowHeatmap },
                ].map(item => (
                    <button key={item.key}
                        onClick={() => item.set(v => !v)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '7px 14px',
                            background: item.val
                                ? `rgba(${hexToRgb(item.color)},0.12)`
                                : T.inputBg,
                            border: `1px solid ${item.val
                                ? item.color + '40'
                                : T.border}`,
                            borderRadius: 8, cursor: 'pointer',
                            fontSize: 12, fontWeight: item.val ? 600 : 400,
                            color: item.val ? item.color : T.textMuted,
                            transition: 'all 0.15s',
                            fontFamily: T.fontBody,
                        }}>
                        <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: item.val ? item.color : T.borderStrong,
                            boxShadow: item.val ? `0 0 6px ${item.color}` : 'none',
                            transition: 'all 0.15s',
                        }} />
                        {item.label}
                        <span style={{
                            background: item.val
                                ? `rgba(${hexToRgb(item.color)},0.2)` : T.inputBg,
                            color: item.val ? item.color : T.textMuted,
                            fontSize: 10, fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 99,
                        }}>
                            {item.count}
                        </span>
                    </button>
                ))}

                {/* vehicle status legend */}
                <div style={{
                    display: 'flex', gap: 10, alignItems: 'center',
                    padding: '7px 14px',
                    background: T.inputBg,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8, fontSize: 11,
                    color: T.textMuted,
                    fontFamily: T.fontBody,
                }}>
                    {[
                        { label: 'Available',    color: '#059669' },
                        { label: 'In use',       color: '#D97706' },
                        { label: 'Maintenance',  color: '#DC2626' },
                    ].map(v => (
                        <span key={v.label} style={{ display: 'flex',
                                                      alignItems: 'center',
                                                      gap: 5 }}>
                            <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: v.color,
                                boxShadow: `0 0 4px ${v.color}`,
                            }} />
                            {v.label}
                        </span>
                    ))}
                </div>

                <button onClick={fetchData} style={{
                    marginLeft: 'auto',
                    padding: '7px 14px',
                    background: T.inputBg,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, color: T.textSec,
                    fontFamily: T.fontBody,
                    transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = T.accentLight;
                    e.currentTarget.style.color = T.accent;
                    e.currentTarget.style.borderColor = T.borderFocus;
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = T.inputBg;
                    e.currentTarget.style.color = T.textSec;
                    e.currentTarget.style.borderColor = T.border;
                }}>
                    ↻ Refresh
                </button>
            </div>

            {/* ── MAP ── */}
            <div style={{
                flex: 1, borderRadius: 16, overflow: 'hidden',
                border: `1px solid ${T.border}`,
                boxShadow: `${T.shadowLg}, 0 0 0 1px ${T.accentLight}`,
                position: 'relative',
            }}>
                {loading ? (
                    <div style={{
                        height: '100%', background: T.inputBg,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexDirection: 'column', gap: 12,
                    }}>
                        <div style={{
                            width: 32, height: 32,
                            border: `2px solid ${T.border}`,
                            borderTop: `2px solid ${T.accent}`,
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                        }} />
                        <p style={{ color: T.textMuted,
                                    fontSize: 13, margin: 0,
                                    fontFamily: T.fontBody }}>
                            Loading map data...
                        </p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (
                    <MapContainer
                        center={[30.3753, 69.3451]}
                        zoom={6}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            maxZoom={19}
                        />

                        {showWh && mapData?.warehouses?.map((w, i) => (
                            w.latitude && w.longitude && (
                                <React.Fragment key={`wh-${i}`}>
                                    <Marker
                                        position={[w.latitude, w.longitude]}
                                        icon={warehouseIcon}
                                    >
                                        <Popup>
                                            <PopupCard
                                                icon="🏭"
                                                title={w.name}
                                                subtitle={`📍 ${w.city}`}
                                                color="#4F46E5"
                                                rows={[
                                                    ['Load', `${w.current_load} / ${w.capacity_units}`],
                                                    ['Usage', `${Math.round((w.current_load / Math.max(w.capacity_units, 1)) * 100)}%`],
                                                ]}
                                            />
                                        </Popup>
                                    </Marker>
                                    <Circle
                                        center={[w.latitude, w.longitude]}
                                        radius={20000}
                                        color="#4F46E5"
                                        fillColor="#4F46E5"
                                        fillOpacity={0.04}
                                        weight={0.8}
                                        dashArray="4 4"
                                    />
                                </React.Fragment>
                            )
                        ))}

                        {showVeh && mapData?.vehicles?.map((v, i) => (
                            v.latitude && v.longitude && (
                                <Marker
                                    key={`veh-${i}`}
                                    position={[v.latitude, v.longitude]}
                                    icon={getVehicleIcon(v.status)}
                                >
                                    <Popup>
                                        <PopupCard
                                            icon="🚚"
                                            title={v.plate_number}
                                            subtitle={v.vehicle_type}
                                            color={
                                                v.status === 'available'   ? '#059669' :
                                                v.status === 'maintenance' ? '#DC2626' :
                                                '#D97706'
                                            }
                                            rows={[
                                                ['Status', v.status],
                                            ]}
                                        />
                                    </Popup>
                                </Marker>
                            )
                        ))}

                        {showShip && mapData?.shipments?.map((s, i) => (
                            s.latitude && s.longitude && (
                                <Marker
                                    key={`ship-${i}`}
                                    position={[s.latitude, s.longitude]}
                                    icon={shipmentIcon}
                                >
                                    <Popup>
                                        <PopupCard
                                            icon="📦"
                                            title={`Shipment #${s.shipment_id}`}
                                            subtitle={s.destination_address}
                                            color="#0284C7"
                                            rows={[
                                                ['Driver',   s.driver_name || 'Unassigned'],
                                                ['Priority', s.priority],
                                                ['Status',   s.status?.replace(/_/g,' ')],
                                            ]}
                                        />
                                    </Popup>
                                </Marker>
                            )
                        ))}

                        {showHeatmap && heatmapData.map((h, i) => {
                            const ratio  = h.delivery_count / maxHeatCount;
                            const radius = 5000 + ratio * 45000;
                            const opacity = 0.12 + ratio * 0.38;
                            return h.lat && h.lng && (
                                <Circle
                                    key={`heat-${i}`}
                                    center={[h.lat, h.lng]}
                                    radius={radius}
                                    color="#DC2626"
                                    fillColor="#DC2626"
                                    fillOpacity={opacity}
                                    weight={0}
                                >
                                    <Popup>
                                        <PopupCard
                                            icon="🔥"
                                            title={`${h.delivery_count} shipment${h.delivery_count !== 1 ? 's' : ''}`}
                                            subtitle={`${h.lat?.toFixed(2)}°N, ${h.lng?.toFixed(2)}°E`}
                                            color="#DC2626"
                                            rows={[['Density cell', `~11 km grid`]]}
                                        />
                                    </Popup>
                                </Circle>
                            );
                        })}
                    </MapContainer>
                )}

                {/* bottom stats overlay */}
                {!loading && (
                    <div style={{
                        position: 'absolute', bottom: 16, left: 16,
                        zIndex: 1000,
                        display: 'flex', gap: 8,
                    }}>
                        {[
                            { label: 'Warehouses',  value: counts.warehouses,
                              color: '#4F46E5', show: true },
                            { label: 'Vehicles',    value: counts.vehicles,
                              color: '#D97706', show: true },
                            { label: 'Shipments',   value: counts.shipments,
                              color: '#0284C7', show: true },
                            { label: 'Density cells', value: counts.heatmap,
                              color: '#DC2626', show: showHeatmap },
                        ].filter(s => s.show).map(s => (
                            <div key={s.label} style={{
                                padding: '6px 12px',
                                background: 'rgba(255,255,255,0.92)',
                                backdropFilter: 'blur(8px)',
                                border: `1px solid ${T.border}`,
                                boxShadow: T.shadowMd,
                                borderRadius: 8,
                                display: 'flex', alignItems: 'center', gap: 7,
                            }}>
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: s.color,
                                    boxShadow: `0 0 6px ${s.color}`,
                                }} />
                                <span style={{
                                    fontSize: 11, fontWeight: 700,
                                    color: T.textPri,
                                    fontFamily: T.fontBody,
                                }}>
                                    {s.value}
                                </span>
                                <span style={{
                                    fontSize: 10,
                                    color: T.textMuted,
                                    fontFamily: T.fontBody,
                                }}>
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── popup card ───────────────────────────────────────────────
function PopupCard({ icon, title, subtitle, color, rows }) {
    return (
        <div style={{
            padding: '14px 16px', minWidth: 180,
            fontFamily: T.fontBody,
        }}>
            <div style={{ display: 'flex', alignItems: 'center',
                          gap: 8, marginBottom: 8 }}>
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: color + '20',
                    border: `1px solid ${color}40`,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 14,
                }}>
                    {icon}
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 13,
                                  color: T.textPri, lineHeight: 1.2 }}>
                        {title}
                    </div>
                    {subtitle && (
                        <div style={{ fontSize: 11, color: T.textSec,
                                      marginTop: 1,
                                      maxWidth: 160, overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap' }}>
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>
            {rows?.length > 0 && (
                <div style={{
                    borderTop: `1px solid ${T.border}`,
                    paddingTop: 8, display: 'flex', flexDirection: 'column',
                    gap: 4,
                }}>
                    {rows.map(([label, val]) => (
                        <div key={label} style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <span style={{ fontSize: 11,
                                           color: T.textMuted }}>
                                {label}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600,
                                           color: T.textPri,
                                           textTransform: 'capitalize' }}>
                                {val}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// helper
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `${r},${g},${b}`;
}