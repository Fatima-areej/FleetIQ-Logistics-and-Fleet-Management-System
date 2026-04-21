export const T = {
    // backgrounds
    pageBg:      '#060810',   
    cardBg:      '#0c0f1d',   
    sidebarBg:   '#080b16',   
    inputBg:     'rgba(255,255,255,0.05)',

    // borders
    border:      'rgba(255,255,255,0.08)',  
    borderFocus: '#4F46E5',

    // text
    textPri:     '#F1F5F9',   
    textSec:     '#94A3B8',  
    textMuted:   '#475569',

    // accent — indigo
    accent:      '#4F46E5',
    accentLight: 'rgba(79,70,229,0.12)',  
    accentHover: '#4338CA',

    // semantic
    success:     '#059669',
    successLight:'rgba(5,150,105,0.12)',   // was #ECFDF5
    warning:     '#D97706',
    warningLight:'rgba(217,119,6,0.12)',   // was #FFFBEB
    danger:      '#DC2626',
    dangerLight: 'rgba(220,38,38,0.12)',   // was #FEF2F2
    info:        '#0284C7',
    infoLight:   'rgba(2,132,199,0.12)',   // was #F0F9FF

    // status colors
    status: {
        created:          { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', label: 'Created'          },
        assigned:         { color: '#38BDF8', bg: 'rgba(56,189,248,0.12)',  label: 'Assigned'         },
        in_transit:       { color: '#FCD34D', bg: 'rgba(252,211,77,0.12)',  label: 'In Transit'       },
        at_warehouse:     { color: '#67E8F9', bg: 'rgba(103,232,249,0.12)', label: 'At Warehouse'     },
        out_for_delivery: { color: '#34D399', bg: 'rgba(52,211,153,0.12)',  label: 'Out for Delivery' },
        delivered:        { color: '#34D399', bg: 'rgba(52,211,153,0.12)',  label: 'Delivered'        },
        cancelled:        { color: '#F87171', bg: 'rgba(248,113,113,0.12)', label: 'Cancelled'        },
    },

    priority: {
        low:    { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
        normal: { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
        high:   { color: '#FCD34D', bg: 'rgba(252,211,77,0.12)'  },
        urgent: { color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
    },

    // layout
    sideW:       240,
    sideWCollapsed: 64,
    topH:        60,

    // shadows
    shadow:   '0 1px 3px rgba(0,0,0,0.4)',
    shadowMd: '0 4px 12px rgba(0,0,0,0.4)',
    shadowLg: '0 10px 25px rgba(0,0,0,0.5)',
    shadowXl: '0 20px 40px rgba(0,0,0,0.6)',

    // radii
    radius:      '10px',
    radiusSm:    '6px',
    radiusLg:    '16px',
    radiusXl:    '20px',
    radiusFull:  '9999px',

    // fonts
    fontHead:    "'Syne', sans-serif",
    fontBody:    "'DM Sans', sans-serif",
};