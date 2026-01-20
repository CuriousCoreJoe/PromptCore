import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import LandingPage from './LandingPage';

const MainRouter: React.FC = () => {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const isAppSubdomain = hostname.startsWith('app.');

    console.log('[MainRouter] Init - Host:', hostname, 'Path:', pathname, 'isAppSubdomain:', isAppSubdomain);

    return (
        <BrowserRouter>
            <Routes>
                {/* 1. App Subdomain Logic */}
                {isAppSubdomain ? (
                    <Route path="/*" element={<App />} />
                ) : (
                    /* 2. Main Domain / Localhost Logic */
                    <>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/app/*" element={<App />} />

                        {/* Convenience routes for legacy paths */}
                        <Route path="/login" element={<Navigate to="/app" replace />} />
                        <Route path="/signup" element={<Navigate to="/app" replace />} />

                        {/* Catch-all for main domain - Redirect to Landing */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </>
                )}
            </Routes>
        </BrowserRouter>
    );
};

export default MainRouter;
