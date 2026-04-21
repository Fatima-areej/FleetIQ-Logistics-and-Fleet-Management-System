import { T } from '../../styles/theme';

export function SkeletonLine({ width = '100%', height = 14, mb = 8 }) {
    return (
        <div style={{
            width,
            height,
            marginBottom:  mb,
            borderRadius:  T.radiusSm,
            background:    'linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%)',
            backgroundSize:'200% 100%',
            animation:     'shimmer 1.4s infinite',
        }} />
    );
}

export function SkeletonCard({ height = 120 }) {
    return (
        <div style={{
            height,
            borderRadius:  T.radiusLg,
            background:    'linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%)',
            backgroundSize:'200% 100%',
            animation:     'shimmer 1.4s infinite',
        }} />
    );
}