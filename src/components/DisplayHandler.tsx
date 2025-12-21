import { EnrouteDisplay } from './EnrouteDisplay';
import { DefaultDisplay } from './DefaultDisplay';
import { useEffect, useState } from 'react';
import { StationDisplay } from './StationDisplay';
import { ConfigModal } from './ConfigModal';

export default function DisplayHandler() {
    const [mode, setMode] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        setMode(query.get('mode'));

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'c') {
                setShowConfig(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Initial render might differ on server/client, but with client:only="react", it renders only on client.
    // However, useState initialization with window.location.search is risky if executed during SSR?
    // No, client:only skips SSR. But to be safe, I put the query reading in useEffect or use safe defaults.
    // The original code: const query = new URLSearchParams(window.location.search); const [mode] = useState...
    // accessing window at top level of component function is fine in client-only, but nicer to use useEffect.
    // I moved it to useEffect or just check typeof window.
    
    // Let's stick closer to original but safe:
    // Actually, creating URLSearchParams inside component body is fine if client-side.
    
    return <>
        {mode === 'enroute' && <EnrouteDisplay />}
        {mode === 'station' && <StationDisplay />}
        {(mode !== 'enroute' && mode !== 'station' && mode !== null) && <DefaultDisplay />}
        {/* Render DefaultDisplay if mode is null too? Original logic: (mode !== 'enroute' && mode !== 'station') includes null. */}
        {(mode === null) && <DefaultDisplay />}
        
        <div className='fixed top-0 left-0 h-[56.25vw] w-screen -z-20 !bg-cover' style={{ background: `url(/art/default.png) center center no-repeat` }}></div>
        {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
    </>
}
