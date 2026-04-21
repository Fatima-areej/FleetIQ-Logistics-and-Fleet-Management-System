import { useEffect } from 'react';
import { T } from '../../styles/theme';

export default function Drawer({ title, onClose, children, width = 520 }) {
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div style={{
            position:   'fixed',
            inset:      0,
            zIndex:     9998,
            display:    'flex',
        }}>
            {/* backdrop */}
            <div style={{
                flex:       1,
                background: 'rgba(15,23,41,0.3)',
                backdropFilter: 'blur(2px)',
                animation:  'fadeIn 0.2s ease',
            }} onClick={onClose} />

            {/* panel */}
            <div style={{
                width:      width,
                background: T.cardBg,
                height:     '100vh',
                overflowY:  'auto',
                boxShadow:  T.shadowXl,
                display:    'flex',
                flexDirection: 'column',
                animation:  'slideInRight 0.25s ease',
            }}>
                {/* header */}
                <div style={{
                    padding:        '1.25rem 1.5rem',
                    borderBottom:   `1px solid ${T.border}`,
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'center',
                    position:       'sticky',
                    top:            0,
                    background:     T.cardBg,
                    zIndex:         1,
                }}>
                    <h3 style={{
                        margin:     0,
                        fontSize:   16,
                        fontWeight: 700,
                        color:      T.textPri,
                        fontFamily: T.fontHead,
                    }}>
                        {title}
                    </h3>
                    <button onClick={onClose} style={{
                        background:   T.inputBg,
                        border:       `1px solid ${T.border}`,
                        borderRadius: T.radiusSm,
                        color:        T.textSec,
                        cursor:       'pointer',
                        fontSize:     13,
                        padding:      '4px 10px',
                        fontFamily:   T.fontBody,
                    }}>
                        Close
                    </button>
                </div>
                <div style={{ padding: '1.5rem', flex: 1 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}