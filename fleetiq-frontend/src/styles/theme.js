/**
 * FleetIQ light theme — professional SaaS + subtle indigo identity.
 * Use T.* everywhere; avoid hardcoded dark hex in new UI.
 */
export const T = {
    // surfaces
    pageBg:         '#EEF2FF',
    pageBgGradient: 'linear-gradient(165deg, #EEF2FF 0%, #F8FAFC 45%, #F1F5F9 100%)',
    cardBg:         '#FFFFFF',
    sidebarBg:      '#FFFFFF',
    topBarBg:       '#FFFFFF',
    inputBg:        '#F8FAFC',
    inputBgFocus:   '#FFFFFF',

    // borders & dividers
    border:         'rgba(15, 23, 42, 0.07)',
    borderStrong:   'rgba(15, 23, 42, 0.11)',
    borderFocus:    '#4F46E5',

    // text
    textPri:        '#0F172A',
    textSec:        '#475569',
    textMuted:      '#94A3B8',
    textInverse:    '#FFFFFF',

    // brand
    accent:         '#4F46E5',
    accentMuted:    '#6366F1',
    accentLight:    'rgba(79, 70, 229, 0.1)',
    accentSoft:     '#EEF2FF',
    accentHover:    '#4338CA',
    accentRing:     'rgba(79, 70, 229, 0.35)',

    // overlays (modals, drawers)
    overlay:        'rgba(15, 23, 42, 0.42)',

    // semantic
    success:        '#059669',
    successLight:   'rgba(5, 150, 105, 0.1)',
    warning:        '#D97706',
    warningLight:   'rgba(217, 119, 6, 0.12)',
    danger:         '#DC2626',
    dangerLight:    'rgba(220, 38, 38, 0.1)',
    info:           '#0369A1',
    infoLight:      'rgba(3, 105, 161, 0.1)',

    // shipment / workflow chips (readable on white)
    status: {
        created:          { color: '#64748B', bg: '#F1F5F9', label: 'Created' },
        assigned:         { color: '#0369A1', bg: '#E0F2FE', label: 'Assigned' },
        in_transit:       { color: '#B45309', bg: '#FEF3C7', label: 'In Transit' },
        at_warehouse:     { color: '#0E7490', bg: '#CFFAFE', label: 'At Warehouse' },
        out_for_delivery: { color: '#047857', bg: '#D1FAE5', label: 'Out for Delivery' },
        delivered:        { color: '#047857', bg: '#D1FAE5', label: 'Delivered' },
        cancelled:        { color: '#B91C1C', bg: '#FEE2E2', label: 'Cancelled' },
    },

    priority: {
        low:    { color: '#64748B', bg: '#F1F5F9' },
        normal: { color: '#2563EB', bg: '#DBEAFE' },
        high:   { color: '#B45309', bg: '#FEF3C7' },
        urgent: { color: '#B91C1C', bg: '#FEE2E2' },
    },

    // layout
    sideW:            252,
    sideWCollapsed:   72,
    topH:             56,

    // elevation (light)
    shadow:           '0 1px 2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.06)',
    shadowMd:         '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
    shadowLg:         '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
    shadowXl:         '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
    shadowSidebar:    '4px 0 24px rgba(15, 23, 42, 0.06)',

    // radii — slightly softer product feel
    radius:           '12px',
    radiusSm:         '8px',
    radiusLg:         '18px',
    radiusXl:         '22px',
    radiusFull:       '9999px',

    // typography (loaded in index.css)
    fontHead:         "'Outfit', 'Syne', system-ui, sans-serif",
    fontBody:         "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif",
};
