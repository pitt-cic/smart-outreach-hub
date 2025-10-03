import React, {useState} from 'react';
import {useMutation, useQuery} from 'urql';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {CLEAR_ALL_DATA, GET_ALL_MESSAGES, GET_CAMPAIGNS, SIMULATE_INBOUND_MESSAGE} from '@/lib/graphql/client';
import {cn, formatPhoneNumber, formatTimestamp} from '@/lib/utils';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Calendar,
    Code,
    Download,
    MessageSquare,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    User
} from 'lucide-react';

export default function MessagesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [directionFilter, setDirectionFilter] = useState<string>('all');
    const [campaignFilter, setCampaignFilter] = useState<string>('all');
    const [responseTypeFilter, setResponseTypeFilter] = useState<string>('all');

    // Developer panel state
    const [showDeveloperPanel, setShowDeveloperPanel] = useState(false);
    const [devPhoneNumber, setDevPhoneNumber] = useState('4127370471');
    const [devMessage, setDevMessage] = useState('');
    const [devSubmitting, setDevSubmitting] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [clearingData, setClearingData] = useState(false);

    // GraphQL queries
    const [messagesResult, refetchMessages] = useQuery({
        query: GET_ALL_MESSAGES,
        variables: {limit: 1000} // Get up to 1000 messages
    });
    const [campaignsResult] = useQuery({query: GET_CAMPAIGNS});

    // GraphQL mutations
    const [simulateInboundResult, simulateInbound] = useMutation(SIMULATE_INBOUND_MESSAGE);
    const [clearDataResult, clearData] = useMutation(CLEAR_ALL_DATA);

    const allMessages = messagesResult.data?.getAllMessages || [];
    const campaigns = campaignsResult.data?.listCampaigns || [];
    const loading = messagesResult.fetching || campaignsResult.fetching;

    console.log('📋 Messages from GraphQL:', allMessages.length);

    // Extract customer names from phone numbers (simplified)
    const getCustomerName = (phoneNumber: string) => {
        // In a real app, you might want to fetch customer data separately
        // For now, we'll just format the phone number nicely
        return formatPhoneNumber(phoneNumber);
    };

    // Filter messages
    const filteredMessages = allMessages.filter((message: any) => {
        const customerName = getCustomerName(message.phoneNumber);

        const matchesSearch = searchTerm === '' ||
            customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            message.phoneNumber.includes(searchTerm) ||
            message.message.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDirection = directionFilter === 'all' || message.direction.toLowerCase() === directionFilter;

        const matchesCampaign = campaignFilter === 'all' || message.campaignId === campaignFilter;

        const matchesResponseType = responseTypeFilter === 'all' ||
            (responseTypeFilter === 'none' && !message.responseType) ||
            (message.responseType && message.responseType.toLowerCase() === responseTypeFilter);

        return matchesSearch && matchesDirection && matchesCampaign && matchesResponseType;
    });

    const exportMessages = () => {
        const csvData = filteredMessages.map((message: any) => ({
            timestamp: message.timestamp,
            customer_phone: message.phoneNumber,
            direction: message.direction,
            message: message.message,
            response_type: message.responseType || '',
            campaign_id: message.campaignId || '',
        }));

        const headers = Object.keys(csvData[0] || {});
        const csvContent = [
            headers.join(','),
            ...csvData.map((row: any) =>
                headers.map(header => {
                    const value = (row as any)[header];
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `message-history-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const refreshMessages = () => {
        refetchMessages({requestPolicy: 'network-only'});
    };

    const handleDevMessageSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!devPhoneNumber.trim() || !devMessage.trim()) return;

        setDevSubmitting(true);
        try {
            const result = await simulateInbound({
                phoneNumber: devPhoneNumber.trim(),
                message: devMessage.trim(),
            });

            if (result.error) {
                console.error('Error simulating inbound message:', result.error);
                alert('Error sending message: ' + result.error.message);
            } else {
                console.log('✅ Simulated inbound message:', result.data?.simulateInboundMessage);
                setDevPhoneNumber('');
                setDevMessage('');
                // Refresh messages to show the new one
                refetchMessages({requestPolicy: 'network-only'});
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error sending message');
        } finally {
            setDevSubmitting(false);
        }
    };

    const handleClearDatabase = async () => {
        if (!showClearConfirm) {
            setShowClearConfirm(true);
            return;
        }

        setClearingData(true);
        try {
            const result = await clearData({});

            if (result.error) {
                console.error('Error clearing database:', result.error);
                alert('Error clearing database: ' + result.error.message);
            } else {
                console.log('✅ Database cleared successfully');
                setShowClearConfirm(false);
                // Refresh messages to show empty state
                refetchMessages({requestPolicy: 'network-only'});
                alert('Database cleared successfully!');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error clearing database');
        } finally {
            setClearingData(false);
        }
    };

    // Check if we're in development mode
    const isDevelopment = import.meta.env.MODE === 'development';

    return (
        <ProtectedRoute>
            <Layout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Message History</h1>
                            <p className="text-gray-600 mt-1">
                                View all sent and received messages across campaigns
                            </p>
                        </div>

                        <div className="flex space-x-3">
                            {isDevelopment && (
                                <button
                                    onClick={() => setShowDeveloperPanel(!showDeveloperPanel)}
                                    className={cn(
                                        "btn-outline",
                                        showDeveloperPanel && "bg-yellow-50 border-yellow-300 text-yellow-700"
                                    )}
                                >
                                    <Code className="h-4 w-4 mr-2"/>
                                    Developer Panel
                                </button>
                            )}

                            <button
                                onClick={refreshMessages}
                                className="btn-outline"
                                disabled={loading}
                            >
                                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")}/>
                                Refresh
                            </button>

                            <button
                                onClick={exportMessages}
                                className="btn-outline"
                                disabled={filteredMessages.length === 0}
                            >
                                <Download className="h-4 w-4 mr-2"/>
                                Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Developer Panel */}
                    {isDevelopment && showDeveloperPanel && (
                        <div className="card bg-yellow-50 border-yellow-200">
                            <div className="card-header">
                                <div className="flex items-center space-x-2">
                                    <Code className="h-5 w-5 text-yellow-600"/>
                                    <h2 className="card-title text-yellow-800">Developer Panel</h2>
                                    <span
                                        className="badge bg-yellow-200 text-yellow-800 text-xs">Development Only</span>
                                </div>
                                <p className="card-description text-yellow-700">
                                    Simulate inbound messages from users for testing purposes
                                </p>
                            </div>
                            <div className="card-content">
                                <form onSubmit={handleDevMessageSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="dev-phone"
                                                   className="block text-sm font-medium text-yellow-700 mb-2">
                                                Phone Number
                                            </label>
                                            <input
                                                id="dev-phone"
                                                type="tel"
                                                value={devPhoneNumber}
                                                onChange={(e) => setDevPhoneNumber(e.target.value)}
                                                placeholder="+1 (555) 123-4567"
                                                className="w-full p-3 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="dev-message"
                                                   className="block text-sm font-medium text-yellow-700 mb-2">
                                                Message
                                            </label>
                                            <input
                                                id="dev-message"
                                                type="text"
                                                value={devMessage}
                                                onChange={(e) => setDevMessage(e.target.value)}
                                                placeholder="Hey, thanks for your message!"
                                                className="w-full p-3 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-yellow-600">
                                            <strong>Note:</strong> This will create an inbound message from the
                                            specified
                                            phone number and save it to the database.
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={devSubmitting || !devPhoneNumber.trim() || !devMessage.trim()}
                                            className="btn-primary bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-300"
                                        >
                                            {devSubmitting ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin"/>
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="h-4 w-4 mr-2"/>
                                                    Simulate Inbound Message
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>

                                {/* Clear Database Section */}
                                <div className="mt-6 pt-6 border-t border-yellow-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-medium text-yellow-800 mb-2">Danger Zone</h3>
                                            <p className="text-sm text-yellow-700">
                                                Clear all data from the database (customers, campaigns, and messages)
                                            </p>
                                        </div>

                                        <div className="flex space-x-2">
                                            {showClearConfirm && (
                                                <button
                                                    onClick={() => setShowClearConfirm(false)}
                                                    className="btn-outline border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                                                    disabled={clearingData}
                                                >
                                                    Cancel
                                                </button>
                                            )}

                                            <button
                                                onClick={handleClearDatabase}
                                                disabled={clearingData}
                                                className={cn(
                                                    "btn-primary",
                                                    showClearConfirm
                                                        ? "bg-red-600 hover:bg-red-700 disabled:bg-red-300"
                                                        : "bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-300"
                                                )}
                                            >
                                                {clearingData ? (
                                                    <>
                                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin"/>
                                                        Clearing...
                                                    </>
                                                ) : showClearConfirm ? (
                                                    <>
                                                        <Trash2 className="h-4 w-4 mr-2"/>
                                                        Confirm Clear Database
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="h-4 w-4 mr-2"/>
                                                        Clear Database
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="card">
                            <div className="card-content p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <MessageSquare className="h-6 w-6 text-blue-600"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Total Messages</p>
                                        <p className="text-2xl font-bold text-gray-900">{allMessages.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-content p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <ArrowUpRight className="h-6 w-6 text-green-600"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Outbound</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {allMessages.filter((m: any) => m.direction.toLowerCase() === 'outbound').length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-content p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <ArrowDownLeft className="h-6 w-6 text-purple-600"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Inbound</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {allMessages.filter((m: any) => m.direction.toLowerCase() === 'inbound').length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-content p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <User className="h-6 w-6 text-orange-600"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Unique Numbers</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {new Set(allMessages.map((m: any) => m.phoneNumber)).size}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="card">
                        <div className="card-content p-6">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/>
                                    <input
                                        type="text"
                                        placeholder="Search messages..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Direction Filter */}
                                <select
                                    value={directionFilter}
                                    onChange={(e) => setDirectionFilter(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Directions</option>
                                    <option value="outbound">Outbound</option>
                                    <option value="inbound">Inbound</option>
                                </select>

                                {/* Response Type Filter */}
                                <select
                                    value={responseTypeFilter}
                                    onChange={(e) => setResponseTypeFilter(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Types</option>
                                    <option value="automated">Automated</option>
                                    <option value="manual">Manual</option>
                                    <option value="none">No Type</option>
                                </select>

                                {/* Campaign Filter */}
                                <select
                                    value={campaignFilter}
                                    onChange={(e) => setCampaignFilter(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Campaigns</option>
                                    {campaigns.map((campaign: any) => (
                                        <option key={campaign.campaignId} value={campaign.campaignId}>
                                            {campaign.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Clear Filters */}
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setDirectionFilter('all');
                                        setCampaignFilter('all');
                                        setResponseTypeFilter('all');
                                    }}
                                    className="btn-outline"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Messages List */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">
                                Messages ({filteredMessages.length})
                            </h2>
                            <p className="card-description">
                                All messages sorted by most recent first
                            </p>
                        </div>

                        <div className="card-content">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-gray-600">Loading messages...</span>
                                </div>
                            ) : filteredMessages.length === 0 ? (
                                <div className="text-center py-12">
                                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No messages found
                                    </h3>
                                    <p className="text-gray-600">
                                        {searchTerm || directionFilter !== 'all' || campaignFilter !== 'all' || responseTypeFilter !== 'all'
                                            ? 'Try adjusting your search or filter criteria.'
                                            : 'No messages have been sent or received yet.'
                                        }
                                    </p>
                                    {allMessages.length === 0 && (
                                        <div className="mt-4">
                                            <button
                                                onClick={refreshMessages}
                                                className="btn-primary"
                                            >
                                                <RefreshCw className="h-4 w-4 mr-2"/>
                                                Refresh Messages
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredMessages.map((message: any) => (
                                        <div
                                            key={message.id}
                                            className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <div className={cn(
                                                            'p-1 rounded-full',
                                                            message.direction.toLowerCase() === 'outbound'
                                                                ? 'bg-blue-100'
                                                                : 'bg-green-100'
                                                        )}>
                                                            {message.direction.toLowerCase() === 'outbound' ? (
                                                                <ArrowUpRight className="h-4 w-4 text-blue-600"/>
                                                            ) : (
                                                                <ArrowDownLeft className="h-4 w-4 text-green-600"/>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <h3 className="font-medium text-gray-900">
                                                                {getCustomerName(message.phoneNumber)}
                                                            </h3>
                                                            <p className="text-sm text-gray-500">
                                                                {message.phoneNumber}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <p className="text-gray-700 mb-3 leading-relaxed">
                                                        {message.message}
                                                    </p>

                                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                        <div className="flex items-center space-x-1">
                                                            <Calendar className="h-4 w-4"/>
                                                            <span>{formatTimestamp(message.timestamp)}</span>
                                                        </div>

                                                        {message.responseType && (
                                                            <span className={cn(
                                                                'badge text-xs',
                                                                message.responseType.toLowerCase() === 'automated'
                                                                    ? 'bg-gray-100 text-gray-800'
                                                                    : 'bg-blue-100 text-blue-800'
                                                            )}>
                              {message.responseType.toLowerCase() === 'automated' ? 'Auto' : 'Manual'}
                            </span>
                                                        )}

                                                        {message.campaignId && (
                                                            <span className="text-xs text-gray-400">
                              Campaign: {campaigns.find((c: any) => c.campaignId === message.campaignId)?.name || message.campaignId}
                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="ml-4 text-right">
                        <span className={cn(
                            'badge text-xs',
                            message.direction.toLowerCase() === 'outbound'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                        )}>
                          {message.direction.toLowerCase() === 'outbound' ? 'Sent' : 'Received'}
                        </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Layout>
        </ProtectedRoute>
    );
}
