import React, {useState} from 'react';
import {useMutation, useQuery} from 'urql';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import CampaignForm from '@/components/campaigns/CampaignForm';
import ContactUpload from '@/components/campaigns/ContactUpload';
import {CREATE_CAMPAIGN, GET_CAMPAIGNS, SEND_CAMPAIGN, UPDATE_CAMPAIGN} from '@/lib/graphql/client';
import {Campaign, CreateCampaignInput, UpdateCampaignInput, UploadResult} from '@/types';
import {cn, formatRelativeTime} from '@/lib/utils';
import {BarChart3, Calendar, MessageSquare, MoreVertical, Play, Plus, Send, Users, Target, Smile, Meh, Frown} from 'lucide-react';

export default function CampaignsPage() {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [showUpload, setShowUpload] = useState(false);

    // GraphQL queries and mutations
    const [campaignsResult, refetchCampaigns] = useQuery({
        query: GET_CAMPAIGNS,
    });

    const [, createCampaign] = useMutation(CREATE_CAMPAIGN);
    const [, updateCampaign] = useMutation(UPDATE_CAMPAIGN);
    const [, sendCampaign] = useMutation(SEND_CAMPAIGN);

    const campaigns = campaignsResult.data?.listCampaigns || [];
    const loading = campaignsResult.fetching;

    const handleCreateCampaign = async (input: CreateCampaignInput | UpdateCampaignInput) => {
        try {
            const result = await createCampaign({input: input as CreateCampaignInput});

            if (result.error) {
                throw new Error(result.error.message);
            }

            setShowCreateForm(false);
            refetchCampaigns();

            // Auto-select the new campaign for upload
            if (result.data?.createCampaign) {
                setSelectedCampaign(result.data.createCampaign);
                setShowUpload(true);
            }
        } catch (error) {
            console.error('Error creating campaign:', error);
            alert('Failed to create campaign. Please try again.');
        }
    };

    const handleUpdateCampaign = async (input: CreateCampaignInput | UpdateCampaignInput) => {
        try {
            const result = await updateCampaign({input: input as UpdateCampaignInput});

            if (result.error) {
                throw new Error(result.error.message);
            }

            setShowEditForm(false);
            setSelectedCampaign(null);
            refetchCampaigns();
            alert('Campaign updated successfully!');
        } catch (error) {
            console.error('Error updating campaign:', error);
            alert('Failed to update campaign. Please try again.');
        }
    };

    const handleEditCampaign = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setShowEditForm(true);
    };

    const handleSendCampaign = async (campaignId: string) => {
        if (!confirm('Are you sure you want to send this campaign? This action cannot be undone.')) {
            return;
        }

        try {
            const result = await sendCampaign({campaignId});

            if (result.error) {
                throw new Error(result.error.message);
            }

            alert('Campaign sent successfully!');
            refetchCampaigns();
        } catch (error) {
            console.error('Error sending campaign:', error);
            alert('Failed to send campaign. Please try again.');
        }
    };

    const handleUploadComplete = (result: UploadResult) => {
        alert(`Upload complete! ${result.validRows} contacts added successfully.`);
        setShowUpload(false);
        setSelectedCampaign(null);
        refetchCampaigns();
    };

    const getStatusColor = (campaign: Campaign) => {
        if (campaign.sentCount === 0) return 'bg-gray-100 text-gray-800';
        if (campaign.sentCount < campaign.totalContacts) return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
    };

    const getStatusText = (campaign: Campaign) => {
        if (campaign.sentCount === 0) return 'Draft';
        if (campaign.sentCount < campaign.totalContacts) return 'In Progress';
        return 'Completed';
    };

    return (
        <ProtectedRoute>
            <Layout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
                            <p className="text-gray-600 mt-1">
                                Create and manage your SMS marketing campaigns
                            </p>
                        </div>

                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="btn-primary"
                        >
                            <Plus className="h-4 w-4 mr-2"/>
                            New Campaign
                        </button>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="card">
                            <div className="card-content p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Send className="h-6 w-6 text-blue-600"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                                        <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
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
                                        <p className="text-2xl font-bold text-gray-900">
                                            {campaigns.reduce((sum: number, c: Campaign) => sum + c.totalContacts, 0)}
                                        </p>
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
                                        <p className="text-2xl font-bold text-gray-900">
                                            {campaigns.reduce((sum: number, c: Campaign) => sum + c.sentCount, 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-content p-6">
                                <div className="flex items-center">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <BarChart3 className="h-6 w-6 text-orange-600"/>
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Responses</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {campaigns.reduce((sum: number, c: Campaign) => sum + c.responseCount, 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Create Campaign Form */}
                    {showCreateForm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">Create New Campaign</h2>
                                    <button
                                        onClick={() => setShowCreateForm(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="p-4">
                                    <CampaignForm onSubmit={handleCreateCampaign}/>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Upload Modal */}
                    {showUpload && selectedCampaign && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">
                                        Upload Contacts - {selectedCampaign.name}
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setShowUpload(false);
                                            setSelectedCampaign(null);
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="p-4">
                                    <ContactUpload
                                        campaignId={selectedCampaign.campaignId}
                                        onUpload={handleUploadComplete}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Campaign Form */}
                    {showEditForm && selectedCampaign && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">Edit Campaign - {selectedCampaign.name}</h2>
                                    <button
                                        onClick={() => {
                                            setShowEditForm(false);
                                            setSelectedCampaign(null);
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="p-4">
                                    <CampaignForm
                                        mode="edit"
                                        initialData={selectedCampaign}
                                        onSubmit={handleUpdateCampaign}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Campaigns List */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">All Campaigns</h2>
                            <p className="card-description">
                                Manage your marketing campaigns and track their performance
                            </p>
                        </div>

                        <div className="card-content">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-gray-600">Loading campaigns...</span>
                                </div>
                            ) : campaigns.length === 0 ? (
                                <div className="text-center py-12">
                                    <Send className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No campaigns yet
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Create your first SMS marketing campaign to get started.
                                    </p>
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="btn-primary"
                                    >
                                        <Plus className="h-4 w-4 mr-2"/>
                                        Create Campaign
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {campaigns.map((campaign: Campaign) => (
                                        <div
                                            key={campaign.campaignId}
                                            className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div
                                                    className="flex-1 cursor-pointer"
                                                    onClick={() => handleEditCampaign(campaign)}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                                            {campaign.name}
                                                        </h3>
                                                        <span className={cn(
                                                            'badge',
                                                            getStatusColor(campaign)
                                                        )}>
                            {getStatusText(campaign)}
                          </span>
                                                    </div>

                                                    <p className="text-gray-600 mt-1 line-clamp-2">
                                                        {campaign.messageTemplate}
                                                    </p>

                                                    <div
                                                        className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
                                                        <div className="flex items-center space-x-1">
                                                            <Users className="h-4 w-4"/>
                                                            <span>{campaign.totalContacts} contacts</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <MessageSquare className="h-4 w-4"/>
                                                            <span>{campaign.sentCount} sent</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <BarChart3 className="h-4 w-4"/>
                                                            <span>{campaign.responseCount} responses</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <Calendar className="h-4 w-4"/>
                                                            <span>{formatRelativeTime(campaign.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-6 mt-2 text-sm text-gray-500">
                                                        <div className="flex items-center space-x-1">
                                                            <span>Handoffs:</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1 w-32 justify-start">
                                                            <Target color='green' className="h-4 w-4"/>
                                                            <span>{campaign.positiveHandoffCount} Positive</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1 w-32 justify-start">
                                                            <Target color='orange' className="h-4 w-4"/>
                                                            <span>{campaign.neutralHandoffCount} Neutral</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1 w-32 justify-start">
                                                            <Target color='red' className="h-4 w-4"/>
                                                            <span>{campaign.negativeHandoffCount} Negative</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-6 mt-2 text-sm text-gray-500">
                                                        <div className="flex items-center space-x-1">
                                                            <span>Initial Responses:</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1 w-32 justify-start">
                                                            <MessageSquare color='green' className="h-4 w-4"/>
                                                            <span>{campaign.firstResponsePositiveCount} Positive</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1 w-32 justify-start">
                                                            <MessageSquare color='orange' className="h-4 w-4"/>
                                                            <span>{campaign.firstResponseNeutralCount} Neutral</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1 w-32 justify-start">
                                                            <MessageSquare color='red' className="h-4 w-4"/>
                                                            <span>{campaign.firstResponseNegativeCount} Negative</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-6 mt-2 text-sm text-gray-500">
                                                        <div className="flex items-center space-x-1">
                                                            <span>User Responses Sentiment:</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1 w-32 justify-start">
                                                            <Smile color='green' className="h-4 w-4"/>
                                                            <span>{campaign.positiveResponseRate}% Positive</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1 w-32 justify-start">
                                                            <Meh color='orange' className="h-4 w-4"/>
                                                            <span>{campaign.neutralResponseRate}% Neutral</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1 w-32 justify-start">
                                                            <Frown color='red' className="h-4 w-4"/>
                                                            <span>{campaign.negativeResponseRate}% Negative</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2 ml-4">
                                                    {campaign.totalContacts === 0 ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedCampaign(campaign);
                                                                setShowUpload(true);
                                                            }}
                                                            className="btn-outline"
                                                        >
                                                            <Users className="h-4 w-4 mr-2"/>
                                                            Add Contacts
                                                        </button>
                                                    ) : campaign.sentCount === 0 ? (
                                                        <button
                                                            onClick={() => handleSendCampaign(campaign.campaignId)}
                                                            className="btn-primary"
                                                        >
                                                            <Play className="h-4 w-4 mr-2"/>
                                                            Send Campaign
                                                        </button>
                                                    ) : (
                                                        <div className="text-sm text-gray-500">
                                                            {campaign.sentCount === campaign.totalContacts
                                                                ? 'Completed'
                                                                : `${Math.round((campaign.sentCount / campaign.totalContacts) * 100)}% sent`
                                                            }
                                                        </div>
                                                    )}

                                                    <button className="p-2 text-gray-400 hover:text-gray-600">
                                                        <MoreVertical className="h-4 w-4"/>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            {campaign.totalContacts > 0 && (
                                                <div className="mt-4">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>Progress</span>
                                                        <span>
                            {campaign.sentCount} / {campaign.totalContacts}
                          </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                            style={{
                                                                width: `${Math.min((campaign.sentCount / campaign.totalContacts) * 100, 100)}%`
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
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
