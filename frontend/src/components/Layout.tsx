import React from 'react';
import {Link, useLocation} from 'react-router-dom';
import {useAuth} from '@/lib/auth';
import {cn} from '@/lib/utils';
import UserDropdown from '@/components/UserDropdown';
import {MessageSquare, Send, Users} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

const navigation = [
    {
        name: 'Campaigns',
        href: '/campaigns',
        icon: Send,
        description: 'Create and manage marketing campaigns'
    },
    {
        name: 'Customer Responses',
        href: '/customers',
        icon: Users,
        description: 'Manage customer responses and conversations'
    },
    {
        name: 'Message History',
        href: '/messages',
        icon: MessageSquare,
        description: 'View all sent and received messages'
    },
];

export default function Layout({children}: LayoutProps) {
    const location = useLocation();
    const {isAuthenticated, isLoading} = useAuth();

    // Don't show layout while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Don't show layout if not authenticated
    if (!isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center justify-center border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                            <MessageSquare className="h-8 w-8 text-blue-600"/>
                            <span className="text-xl font-bold text-gray-900">
                Marketing Hub
              </span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 px-4 py-6">
                        {navigation.map((item) => {
                            const isActive = location.pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={cn(
                                        'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            'mr-3 h-5 w-5 flex-shrink-0',
                                            isActive
                                                ? 'text-blue-500'
                                                : 'text-gray-400 group-hover:text-gray-500'
                                        )}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="border-t border-gray-200 p-4">
                        <UserDropdown/>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="pl-64">
                {/* Top bar */}
                <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
                    <div className="flex items-center justify-between h-16 px-6">
                        <div className="flex items-center space-x-4">
                            {/* Breadcrumb or page title could go here */}
                        </div>

                        {/* Right side of top bar */}
                        <div className="flex items-center space-x-4">
                            <UserDropdown/>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex-1">
                    <div className="p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
