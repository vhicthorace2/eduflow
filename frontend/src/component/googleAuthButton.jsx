import { useEffect, useRef, useState } from 'react';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

function GoogleAuthButton({ clientId, text = 'continue_with', onCredential, onUnavailable }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.google?.accounts?.id || !containerRef.current) return;
      const width = Math.min(containerRef.current.offsetWidth || 320, 400);
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) callbackRef.current(response.credential);
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text,
        width,
      });
    };

    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      if (window.google?.accounts?.id) {
        render();
      } else {
        existing.addEventListener('load', render, { once: true });
      }
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId || failed) {
    return (
      <button
        type='button'
        onClick={() => onUnavailable?.()}
        className='flex w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-card-strong px-4 py-3 text-sm font-semibold text-secondary transition hover:bg-card-hover'
      >
        <GoogleMark />
        Continue with Google
      </button>
    );
  }

  return <div ref={containerRef} className='flex w-full justify-center' />;
}

function GoogleMark() {
  return (
    <svg className='h-5 w-5' viewBox='0 0 24 24' aria-hidden='true'>
      <path
        fill='#4285F4'
        d='M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.59-5.17 3.59-8.87z'
      />
      <path
        fill='#34A853'
        d='M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z'
      />
      <path
        fill='#FBBC05'
        d='M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a11.99 11.99 0 0 0 0 10.74l3.98-3.09z'
      />
      <path
        fill='#EA4335'
        d='M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z'
      />
    </svg>
  );
}

export default GoogleAuthButton;
