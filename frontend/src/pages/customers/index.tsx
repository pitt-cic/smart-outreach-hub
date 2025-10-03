import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useMutation, useQuery} from 'urql';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
    GET_ALL_CUSTOMERS,
    GET_CHAT_HISTORY,
    GET_CUSTOMERS_BY_STATUS,
    GET_CUSTOMERS_NEEDING_RESPONSE,
    GET_PREFILLED_MEETING_MESSAGE,
    SEND_MANUAL_MESSAGE,
    UPDATE_CUSTOMER_STATUS,
    graphqlClient
} from '@/lib/graphql/client';
import {ChatMessage, Customer, CustomerStatus} from '@/types';
import {cn, formatPhoneNumber, formatTimestamp, getStatusColor, getStatusLabel} from '@/lib/utils';
import {AlertCircle, CheckCircle, MessageSquare, Phone, Search, Send, User} from 'lucide-react';

export default function CustomersPage() {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [messageText, setMessageText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('needs_response');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // GraphQL queries and mutations
    const getQueryAndVariables = () => {
        if (statusFilter === 'all') {
            return {query: GET_ALL_CUSTOMERS, variables: {}};
        } else if (statusFilter === 'needs_response') {
            return {query: GET_CUSTOMERS_NEEDING_RESPONSE, variables: {}};
        } else {
            return {query: GET_CUSTOMERS_BY_STATUS, variables: {status: statusFilter}};
        }
    };

    const {query, variables} = getQueryAndVariables();
    const [customersResult, refetchCustomers] = useQuery({query, variables});

    const [chatResult, refetchChat] = useQuery({
        query: GET_CHAT_HISTORY,
        variables: {phoneNumber: selectedCustomer?.phoneNumber || ''},
        pause: !selectedCustomer,
    });

    const [, sendMessage] = useMutation(SEND_MANUAL_MESSAGE);
    const [, updateStatus] = useMutation(UPDATE_CUSTOMER_STATUS);

    // State for meeting message loading
    const [meetingMessageLoading, setMeetingMessageLoading] = useState(false);

    // Auto-refresh data periodically since we removed real-time subscriptions
    useEffect(() => {
        const interval = setInterval(() => {
            refetchCustomers();
            if (selectedCustomer) {
                refetchChat();
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [selectedCustomer, refetchCustomers, refetchChat]);

    const customers = customersResult.data?.listCustomersNeedingResponse ||
        customersResult.data?.listCustomersByStatus ||
        customersResult.data?.listAllCustomers || [];
    const chatMessages = useMemo(() => chatResult.data?.getChatHistory || [], [chatResult.data?.getChatHistory]);
    const loading = customersResult.fetching;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    // Clear message text when switching customers
    useEffect(() => {
        setMessageText('');
    }, [selectedCustomer]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCustomer || !messageText.trim()) return;

        try {
            const result = await sendMessage({
                phoneNumber: selectedCustomer.phoneNumber,
                message: messageText.trim(),
            });

            if (result.error) {
                throw new Error(result.error.message);
            }

            setMessageText('');
            refetchChat();

            // Update customer status to agent_responding
            await updateStatus({
                phoneNumber: selectedCustomer.phoneNumber,
                status: 'agent_responding',
            });

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    };

    const handleStatusChange = async (customer: Customer, newStatus: CustomerStatus) => {
        try {
            await updateStatus({
                phoneNumber: customer.phoneNumber,
                status: newStatus,
            });

            refetchCustomers();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status. Please try again.');
        }
    };

    const handleScheduleMeeting = async () => {
        if (!selectedCustomer) return;

        setMeetingMessageLoading(true);
        try {
            const result = await graphqlClient.query(
                GET_PREFILLED_MEETING_MESSAGE,
                {phoneNumber: selectedCustomer.phoneNumber}
            );

            if (result.data?.getPrefilledMeetingMessage) {
                setMessageText(result.data.getPrefilledMeetingMessage);
            }
        } catch (error) {
            console.error('Error getting meeting message:', error);
            alert('Failed to get meeting message. Please try again.');
        } finally {
            setMeetingMessageLoading(false);
        }
    };

    const filteredCustomers = customers.filter((customer: Customer) => {
        const matchesSearch = searchTerm === '' ||
            customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phoneNumber.includes(searchTerm);

        return matchesSearch;
    });

    return (
        <ProtectedRoute>
            <Layout>
                <div className="h-[calc(100vh-8rem)] flex">
                    {/* Customer List Sidebar */}
                    <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200">
                            <h1 className="text-xl font-semibold text-gray-900 mb-4">
                                Customer Responses
                            </h1>

                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"/>
                                <input
                                    type="text"
                                    placeholder="Search customers..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'all')}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Statuses</option>
                                <option value="needs_response">Needs Response</option>
                                <option value="agent_responding">Agent Responding</option>
                                <option value="automated">Automated</option>
                            </select>
                        </div>

                        {/* Customer List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-sm text-gray-600">Loading...</span>
                                </div>
                            ) : filteredCustomers.length === 0 ? (
                                <div className="text-center py-8 px-4">
                                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                                        No customers found
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {searchTerm || statusFilter !== 'all'
                                            ? 'Try adjusting your search or filter criteria.'
                                            : 'No customers need responses at this time.'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1 p-2">
                                    {filteredCustomers.map((customer: Customer) => (
                                        <div
                                            key={customer.phoneNumber}
                                            onClick={() => setSelectedCustomer(customer)}
                                            className={cn(
                                                'p-3 rounded-lg cursor-pointer transition-colors',
                                                selectedCustomer?.phoneNumber === customer.phoneNumber
                                                    ? 'bg-blue-50 border border-blue-200'
                                                    : 'hover:bg-gray-50'
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-medium text-gray-900">
                                                    {customer.firstName} {customer.lastName}
                                                </div>
                                                <span className={cn('badge text-xs', getStatusColor(customer.status))}>
                        {getStatusLabel(customer.status)}
                      </span>
                                            </div>

                                            <div className="text-sm text-gray-600 mb-1">
                                                {formatPhoneNumber(customer.phoneNumber)}
                                            </div>

                                            <div className="text-xs text-gray-500">
                                                Updated {formatTimestamp(customer.updatedAt)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Interface */}
                    <div className="flex-1 flex flex-col bg-gray-50">
                        {selectedCustomer ? (
                            <>
                                {/* Chat Header */}
                                <div className="bg-white border-b border-gray-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <User className="h-5 w-5 text-blue-600"/>
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900">
                                                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                                                </h2>
                                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                    <Phone className="h-4 w-4"/>
                                                    <span>{formatPhoneNumber(selectedCustomer.phoneNumber)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                    <span className={cn('badge', getStatusColor(selectedCustomer.status))}>
                      {getStatusLabel(selectedCustomer.status)}
                    </span>

                                            <select
                                                value={selectedCustomer.status}
                                                onChange={(e) => handleStatusChange(selectedCustomer, e.target.value as CustomerStatus)}
                                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="automated">Automated</option>
                                                <option value="needs_response">Needs Response</option>
                                                <option value="agent_responding">Agent Responding</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {chatResult.fetching ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div
                                                className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            <span className="ml-2 text-sm text-gray-600">Loading messages...</span>
                                        </div>
                                    ) : chatMessages.length === 0 ? (
                                        <div className="text-center py-8">
                                            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                                            <p className="text-gray-600">No messages yet</p>
                                        </div>
                                    ) : (
                                        chatMessages.map((message: ChatMessage) => (
                                            <div
                                                key={message.id}
                                                className={cn(
                                                    'flex',
                                                    message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                                                        message.direction === 'outbound'
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-white border border-gray-200 text-gray-900'
                                                    )}
                                                >
                                                    <p className="text-sm">{message.message}</p>
                                                    <div className={cn(
                                                        'flex items-center justify-between mt-1 text-xs',
                                                        message.direction === 'outbound'
                                                            ? 'text-blue-100'
                                                            : 'text-gray-500'
                                                    )}>
                                                        <span>{formatTimestamp(message.timestamp)}</span>
                                                        {message.responseType && (
                                                            <span className="ml-2">
                              {message.responseType === 'automated' ? (
                                  <span className="flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1"/>
                                  Auto
                                </span>
                              ) : message.responseType === 'ai_agent' ? (
                                  <span className="flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1"/>
                                  AI Agent
                                </span>
                              ) : (
                                  <span className="flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1"/>
                                  Manual
                                </span>
                              )}
                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef}/>
                                </div>

                                {/* Message Input */}
                                <div className="bg-white border-t border-gray-200 p-4">
                                    <form onSubmit={handleSendMessage} className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder="Type your message..."
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            disabled={chatResult.fetching}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!messageText.trim() || chatResult.fetching}
                                            className="btn-primary"
                                        >
                                            <Send className="h-4 w-4"/>
                                        </button>
                                    </form>

                                    <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                                        <span>Press Enter to send • {messageText.length}/160 characters</span>
                                        <button
                                            type="button"
                                            onClick={handleScheduleMeeting}
                                            disabled={meetingMessageLoading || !selectedCustomer}
                                            className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {meetingMessageLoading ? 'Loading...' : 'Fill Meeting Message'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4"/>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Select a customer
                                    </h3>
                                    <p className="text-gray-600">
                                        Choose a customer from the list to view their conversation and respond to their
                                        messages.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Layout>
        </ProtectedRoute>
    );
}
