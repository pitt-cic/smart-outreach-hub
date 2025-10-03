import React from 'react';
import {useQuery} from 'urql';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {GET_CAMPAIGNS, GET_CUSTOMERS_NEEDING_RESPONSE} from '@/lib/graphql/client';
import {Campaign, Customer} from '@/types';
import {formatRelativeTime} from '@/lib/utils';
import {debugAuth, testGraphQLAuth} from '@/lib/auth-debug';
import {AlertCircle, Bug, CheckCircle, MessageSquare, Send, TrendingUp, Users} from 'lucide-react';
import {Link} from 'react-router-dom';

export default function HomePage() {
    const [campaignsResult] = useQuery({query: GET_CAMPAIGNS});
    const [customersResult] = useQuery({query: GET_CUSTOMERS_NEEDING_RESPONSE});

    const campaigns = campaignsResult.data?.listCampaigns || [];
    const customers = customersResult.data?.listCustomersNeedingResponse || [];
    const loading = campaignsResult.fetching || customersResult.fetching;

    // Calculate stats
    const totalCampaigns = campaigns.length;
    const totalContacts = campaigns.reduce((sum: number, c: Campaign) => sum + c.totalContacts, 0);
    const totalSent = campaigns.reduce((sum: number, c: Campaign) => sum + c.sentCount, 0);
    const totalResponses = campaigns.reduce((sum: number, c: Campaign) => sum + c.responseCount, 0);
    const responseRate = totalSent > 0 ? ((totalResponses / totalSent) * 100).toFixed(1) : '0';

    // Recent campaigns (last 5)
    const recentCampaigns = campaigns
        .sort((a: Campaign, b: Campaign) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    // Customers needing response (first 5)
    const urgentCustomers = customers.slice(0, 5);

    return (
        <ProtectedRoute>
            <Layout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-gray-600 mt-1">
                                Overview of your SMS marketing campaigns and customer responses
                            </p>
                        </div>

                        {/* Debug buttons - only show in development */}
                        {import.meta.env.DEV && (
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => debugAuth()}
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <Bug className="h-4 w-4 mr-1"/>
                                    Debug Auth
                                </button>
                                <button
                                    onClick={() => testGraphQLAuth()}
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <Bug className="h-4 w-4 mr-1"/>
                                    Test GraphQL
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="card">
                            <div className="card-content p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Send className="h-6 w-6 text-blue-600"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                                        <p className="text-2xl font-bold text-gray-900">{totalCampaigns}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-content p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Users className="h-6 w-6 text-green-600"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                                        <p className="text-2xl font-bold text-gray-900">{totalContacts.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-content p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <MessageSquare className="h-6 w-6 text-purple-600"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Messages Sent</p>
                                        <p className="text-2xl font-bold text-gray-900">{totalSent.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-content p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <TrendingUp className="h-6 w-6 text-orange-600"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Response Rate</p>
                                        <p className="text-2xl font-bold text-gray-900">{responseRate}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Campaigns */}
                        <div className="card">
                            <div className="card-header">
                                <div className="flex items-center justify-between">
                                    <h2 className="card-title">Recent Campaigns</h2>
                                    <Link to="/campaigns" className="text-sm text-blue-600 hover:text-blue-800">
                                        View all
                                    </Link>
                                </div>
                            </div>
                            <div className="card-content">
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div
                                            className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        <span className="ml-2 text-sm text-gray-600">Loading...</span>
                                    </div>
                                ) : recentCampaigns.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Send className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                                        <p className="text-gray-600">No campaigns yet</p>
                                        <Link to="/campaigns" className="btn-primary mt-4 inline-flex">
                                            Create Campaign
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {recentCampaigns.map((campaign: Campaign) => (
                                            <div key={campaign.campaignId}
                                                 className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                                                    <div
                                                        className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                                        <span>{campaign.totalContacts} contacts</span>
                                                        <span>{campaign.sentCount} sent</span>
                                                        <span>{campaign.responseCount} responses</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-500">
                                                        {formatRelativeTime(campaign.createdAt)}
                                                    </div>
                                                    <div className="mt-1">
                                                        {campaign.sentCount === 0 ? (
                                                            <span
                                                                className="badge bg-gray-100 text-gray-800">Draft</span>
                                                        ) : campaign.sentCount < campaign.totalContacts ? (
                                                            <span className="badge bg-yellow-100 text-yellow-800">In Progress</span>
                                                        ) : (
                                                            <span
                                                                className="badge bg-green-100 text-green-800">Completed</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Customers Needing Response */}
                        <div className="card">
                            <div className="card-header">
                                <div className="flex items-center justify-between">
                                    <h2 className="card-title">Customers Needing Response</h2>
                                    <Link to="/customers" className="text-sm text-blue-600 hover:text-blue-800">
                                        View all
                                    </Link>
                                </div>
                            </div>
                            <div className="card-content">
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div
                                            className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        <span className="ml-2 text-sm text-gray-600">Loading...</span>
                                    </div>
                                ) : urgentCustomers.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4"/>
                                        <p className="text-gray-600">All caught up!</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            No customers need responses right now.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {urgentCustomers.map((customer: Customer) => (
                                            <div key={customer.phoneNumber}
                                                 className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                                                        <AlertCircle className="h-4 w-4 text-red-600"/>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-gray-900">
                                                            {customer.firstName} {customer.lastName}
                                                        </h3>
                                                        <p className="text-sm text-gray-500">
                                                            {customer.phoneNumber}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-500">
                                                        {formatRelativeTime(customer.updatedAt)}
                                                    </div>
                                                    <span className="badge bg-red-100 text-red-800 mt-1">
                          Needs Response
                        </span>
                                                </div>
                                            </div>
                                        ))}

                                        {customers.length > 5 && (
                                            <div className="text-center pt-2">
                                                <Link to="/customers"
                                                      className="text-sm text-blue-600 hover:text-blue-800">
                                                    +{customers.length - 5} more customers need responses
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Quick Actions</h2>
                            <p className="card-description">
                                Common tasks to manage your SMS marketing campaigns
                            </p>
                        </div>
                        <div className="card-content">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Link to="/campaigns"
                                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Send className="h-5 w-5 text-blue-600"/>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">Create Campaign</h3>
                                            <p className="text-sm text-gray-500">Start a new SMS marketing campaign</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link to="/customers"
                                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <MessageSquare className="h-5 w-5 text-green-600"/>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">Respond to Customers</h3>
                                            <p className="text-sm text-gray-500">Reply to customer messages</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link to="/messages"
                                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <MessageSquare className="h-5 w-5 text-purple-600"/>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">Message History</h3>
                                            <p className="text-sm text-gray-500">View all sent and received messages</p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        </ProtectedRoute>
    );
}
