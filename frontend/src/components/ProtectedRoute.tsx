import React, {useEffect} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useAuth} from '@/lib/auth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function ProtectedRoute({children, fallback}: ProtectedRouteProps) {
    const {isAuthenticated, isLoading} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Store the current path to redirect back after login
            const returnUrl = location.pathname;
            navigate(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        }
    }, [isAuthenticated, isLoading, navigate, location.pathname]);

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            fallback || (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <div
                            className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading...</p>
                    </div>
                </div>
            )
        );
    }

    // Don't render children if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}