import { useEffect } from 'react';
import { T } from '../../styles/theme';
import Btn from './Btn';

export default function Modal({ title, onClose, children, width = 440 }) {
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return (
        <div style={{
            position:       'fixed',
            inset:          0,
            background:     'rgba(15, 23, 41, 0.45)',
            backdropFilter: 'blur(4px)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            zIndex:         9999,
            padding:        '1rem',
            animation:      'fadeIn 0.15s ease',
        }} onClick={onClose}>
            <div style={{
                background:   T.cardBg,
                borderRadius: T.radiusXl,
                padding:      '1.75rem',
                width:        '100%',
                maxWidth:     width,
                maxHeight:    '85vh',
                overflowY:    'auto',
                boxShadow:    T.shadowXl,
                animation:    'slideUp 0.2s ease',
            }} onClick={e => e.stopPropagation()}>
                <div style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'center',
                    marginBottom:   '1.5rem',
                }}>
                    <h3 style={{
                        margin:     0,
                        fontSize:   17,
                        fontWeight: 700,
                        color:      T.textPri,
                        fontFamily: T.fontHead,
                    }}>
                        {title}
                    </h3>
                    <button onClick={onClose} style={{
                        background:   'transparent',
                        border:       'none',
                        color:        T.textMuted,
                        cursor:       'pointer',
                        fontSize:     20,
                        lineHeight:   1,
                        padding:      '2px 6px',
                        borderRadius: T.radiusSm,
                        transition:   'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = T.inputBg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}