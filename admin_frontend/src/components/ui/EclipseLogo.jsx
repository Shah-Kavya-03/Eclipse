import React from 'react';
import logoDark from '../../assets/eclipse-logo-dark-transparent.png';
import logoLight from '../../assets/eclipse-updated-light.png';
import { useTheme } from '../../context/ThemeContext.jsx';

/**
 * Reusable official Eclipse Logo component for Admin Frontend.
 * Theme-aware: displays dark-theme logo in Dark mode and light-theme logo in Light mode.
 * Seamlessly adapts when theme is set to System Default via resolvedTheme.
 */
export function EclipseLogo({ className = '', style = {}, size = 32, alt = 'Eclipse Logo' }) {
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === 'light' ? logoLight : logoDark;

  return (
    <div
      className={`eclipse-logo-container ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src={logoSrc}
        alt={alt}
        className="eclipse-logo-img"
        draggable="false"
        loading="eager"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}

export default EclipseLogo;
