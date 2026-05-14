import { useEffect, useRef } from 'react';
import './Confetti.css';

export default function Confetti({ duration = 3000, onComplete }) {
    const containerRef = useRef(null);

    useEffect(() => {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
        const confettiCount = 50;
        const container = containerRef.current;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (Math.random() * 1 + 1.5) + 's';
            container.appendChild(confetti);
        }

        const timer = setTimeout(() => {
            if (onComplete) onComplete();
        }, duration);

        return () => {
            clearTimeout(timer);
            container.innerHTML = '';
        };
    }, [duration, onComplete]);

    return <div ref={containerRef} className="confetti-container" />;
}
