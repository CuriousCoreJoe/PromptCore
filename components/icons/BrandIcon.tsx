import React from 'react';

export const BrandIcon = ({ className }: { className?: string }) => (
    <svg
        width="100%"
        height="100%"
        viewBox="0 0 16 16"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        style={{ fillRule: 'evenodd', clipRule: 'evenodd', strokeLinejoin: 'round', strokeMiterlimit: 2 }}
        className={className}
    >
        <path d="M7.99,4.39L5.366,4.39L5.366,11.51L6.622,11.51L6.622,9.244L7.99,9.244C9.399,9.244 10.634,8.371 10.634,6.817C10.634,5.262 9.399,4.39 7.99,4.39ZM7.99,8.08L6.622,8.08L6.622,5.553L7.99,5.553C8.786,5.553 9.378,5.984 9.378,6.817C9.378,7.649 8.786,8.08 7.99,8.08Z" style={{ fill: '#d9eefb', fillRule: 'nonzero' }} />
        <path d="M9.378,11.61C9.735,11.61 10.021,11.33 10.021,10.979C10.021,10.628 9.735,10.347 9.378,10.347C9.02,10.347 8.735,10.628 8.735,10.979C8.735,11.33 9.02,11.61 9.378,11.61Z" style={{ fill: '#d9eefb', fillRule: 'nonzero' }} />
        <path id="O" d="M8.011,16C3.481,16 0,12.405 0,8C0,3.595 3.481,-0 8.011,-0C12.519,-0 16,3.595 16,8C16,12.405 12.519,16 8.011,16ZM8.011,14.225C11.448,14.225 14.081,11.397 14.081,8C14.081,4.603 11.448,1.775 8.011,1.775C4.552,1.775 1.919,4.603 1.919,8C1.919,11.397 4.552,14.225 8.011,14.225Z" style={{ fill: 'url(#_Radial1_BrandIcon)', fillRule: 'nonzero' }} />
        <defs>
            <radialGradient id="_Radial1_BrandIcon" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(16,0,0,16,5.365565,8)">
                <stop offset="0" style={{ stopColor: '#22d3ee', stopOpacity: 1 }} />
                <stop offset="0.5" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                <stop offset="1" style={{ stopColor: '#22d3ee', stopOpacity: 1 }} />
            </radialGradient>
        </defs>
    </svg>
);
