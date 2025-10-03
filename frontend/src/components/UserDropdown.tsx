import React, {useEffect, useRef, useState} from 'react';
import {useAuth} from '@/lib/auth';
import {cn} from '@/lib/utils';
import {ChevronDown, LogOut, Settings, User} from 'lucide-react';

export default function UserDropdown() {
    const {user, signOut} = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get user display name
    const displayName = user?.signInDetails?.loginId || 'User';
    const userInitials = displayName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
            setIsOpen(false);
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <div
                    className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                    {userInitials}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {displayName}
                </span>
                <ChevronDown className={cn(
                    'h-4 w-4 text-gray-500 transition-transform',
                    isOpen && 'transform rotate-180'
                )}/>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <div
                                className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                                {userInitials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {displayName}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {user.signInDetails?.loginId}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                            onClick={() => {
                                setIsOpen(false);
                                // TODO: Implement profile page
                                console.log('Profile clicked');
                            }}
                        >
                            <User className="h-4 w-4"/>
                            <span>Profile</span>
                        </button>

                        <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                            onClick={() => {
                                setIsOpen(false);
                                // TODO: Implement settings page
                                console.log('Settings clicked');
                            }}
                        >
                            <Settings className="h-4 w-4"/>
                            <span>Settings</span>
                        </button>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-200 py-1">
                        <button
                            onClick={handleSignOut}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                            <LogOut className="h-4 w-4"/>
                            <span>Sign out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}