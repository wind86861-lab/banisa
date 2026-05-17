import React from 'react';
import './BanisaLoader.css';

const BanisaLoader = ({ message = 'Yuklanmoqda' }) => {
    return (
        <div className="banisa-loader-overlay">
            <div className="banisa-loader">
                <svg viewBox="0 0 160 160">
                    <g className="seg">
                        <line x1="80" y1="80" x2="80" y2="20" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="80" cy="20" r="9" fill="#2dd4bf" />
                    </g>
                    <g className="seg">
                        <line x1="80" y1="80" x2="131.96" y2="50" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="131.96" cy="50" r="6.5" fill="#14b8a6" />
                    </g>
                    <g className="seg">
                        <line x1="80" y1="80" x2="131.96" y2="110" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="131.96" cy="110" r="6.5" fill="#0d9488" />
                    </g>
                    <g className="seg">
                        <line x1="80" y1="80" x2="80" y2="140" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="80" cy="140" r="6.5" fill="#14b8a6" />
                    </g>
                    <g className="seg">
                        <line x1="80" y1="80" x2="28.04" y2="110" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="28.04" cy="110" r="6.5" fill="#2dd4bf" />
                    </g>
                    <g className="seg">
                        <line x1="80" y1="80" x2="28.04" y2="50" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="28.04" cy="50" r="6.5" fill="#5eead4" />
                    </g>
                    <g className="core">
                        <circle cx="80" cy="80" r="24" fill="#0d9488" />
                        <text 
                            x="80" 
                            y="80" 
                            textAnchor="middle" 
                            dominantBaseline="central" 
                            fontFamily="Plus Jakarta Sans, system-ui" 
                            fontWeight="800" 
                            fontSize="30" 
                            fill="#fff"
                        >
                            B
                        </text>
                    </g>
                </svg>
                <div className="banisa-loader-label">{message}</div>
            </div>
        </div>
    );
};

export default BanisaLoader;
