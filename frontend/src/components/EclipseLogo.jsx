import React, { useState, useEffect } from 'react';
import logoDark from '../assets/eclipse-logo-dark-transparent.png';
import logoLight from '../assets/eclipse-updated-light.png';

/**
 * Hook to reactively track the active theme across the application.
 * Synchronises with data-theme on <html>, localStorage, and custom events.
 */
export function useCurrentTheme() {
    const [theme, setTheme] = useState(() => {
        return document.documentElement.getAttribute('data-theme') === 'light' ||
            localStorage.getItem('eclipseTheme') === 'light'
            ? 'light'
            : 'dark';
    });

    useEffect(() => {
        const updateTheme = () => {
            const isLight =
                document.documentElement.getAttribute('data-theme') === 'light' ||
                localStorage.getItem('eclipseTheme') === 'light';
            setTheme(isLight ? 'light' : 'dark');
        };

        window.addEventListener('eclipse-theme-change', updateTheme);
        window.addEventListener('storage', updateTheme);

        const observer = new MutationObserver(() => {
            updateTheme();
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });

        return () => {
            window.removeEventListener('eclipse-theme-change', updateTheme);
            window.removeEventListener('storage', updateTheme);
            observer.disconnect();
        };
    }, []);

    return theme;
}

/**
 * Reusable official Eclipse Logo component.
 * Theme-aware: automatically displays eclipse-logo-dark.jpeg in dark theme
 * and eclipse-logo-light.png in light theme.
 * Always renders in a clean circular 1:1 format.
 */
export default function EclipseLogo({ className = '', style = {}, alt = 'Eclipse Logo' }) {
    const theme = useCurrentTheme();
    const logoSrc = theme === 'light' ? logoLight : logoDark;

    return (
        <div className={`eclipse-logo-wrapper ${className}`} style={style}>
            <img
                src={logoSrc}
                alt={alt}
                className="eclipse-logo-img"
                draggable="false"
                loading="eager"
            />
        </div>
    );
}
