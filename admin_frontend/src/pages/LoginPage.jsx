import React, { useEffect } from 'react';

/**
 * The separate admin login page is obsolete.
 * Administrators authenticate through the primary user-facing interface.
 * Any direct request to this component immediately redirects to the public user application.
 */
export function LoginPage() {
  useEffect(() => {
    const hostname = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
    window.location.replace(`http://${hostname}:5173/`);
  }, []);

  return null;
}

export default LoginPage;
