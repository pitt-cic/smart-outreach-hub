import React, {useState} from 'react';
import {Campaign, CreateCampaignInput, UpdateCampaignInput} from '@/types';
import {cn} from '@/lib/utils';
import {AlertCircle, Save} from 'lucide-react';

interface CampaignFormProps {
    mode?: 'create' | 'edit';
    onSubmit: (campaign: CreateCampaignInput | UpdateCampaignInput) => void;
    loading?: boolean;
    initialData?: Partial<CreateCampaignInput> | Campaign;
}

export default function CampaignForm({
                                         mode = 'create',
                                         onSubmit,
                                         loading = false,
                                         initialData
                                     }: CampaignFormProps) {
    // Helper to check if we have a full campaign (for edit mode)
    const isEditMode = mode === 'edit';
    const campaign = isEditMode && initialData && 'campaignId' in initialData ? initialData as Campaign : null;

    const [formData, setFormData] = useState<CreateCampaignInput>({
        name: initialData?.name || '',
        messageTemplate: initialData?.messageTemplate || (isEditMode ? '' : 'Hi {{first_name}}! 🏈 It\'s an exciting season coming up - get your season tickets now and save 20% with early bird pricing! Don\'t miss out on the action. Reply STOP to opt out.'),
        campaignDetails: initialData?.campaignDetails || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // In edit mode, only validate campaign details (other fields are read-only)
        if (isEditMode) {
            // No validation needed for edit mode since campaign details is optional
            setErrors(newErrors);
            return true;
        }

        // Create mode validations
        if (!formData.name.trim()) {
            newErrors.name = 'Campaign name is required';
        } else if (formData.name.length < 3) {
            newErrors.name = 'Campaign name must be at least 3 characters';
        }

        if (!formData.messageTemplate.trim()) {
            newErrors.messageTemplate = 'Message template is required';
        } else if (formData.messageTemplate.length < 10) {
            newErrors.messageTemplate = 'Message template must be at least 10 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            if (isEditMode && campaign) {
                // Edit mode - only send campaign details
                onSubmit({
                    campaignId: campaign.campaignId,
                    campaignDetails: formData.campaignDetails?.trim() || undefined,
                } as UpdateCampaignInput);
            } else {
                // Create mode - send all fields
                onSubmit({
                    name: formData.name.trim(),
                    messageTemplate: formData.messageTemplate.trim(),
                    campaignDetails: formData.campaignDetails?.trim() || undefined,
                } as CreateCampaignInput);
            }
        }
    };

    const handleInputChange = (field: keyof CreateCampaignInput, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({...prev, [field]: ''}));
        }
    };

    const templateVariables = [
        {variable: '{{first_name}}', description: 'Customer\'s first name'},
        {variable: '{{last_name}}', description: 'Customer\'s last name'},
    ];

    const insertVariable = (variable: string) => {
        const textarea = document.getElementById('messageTemplate') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = formData.messageTemplate;
            const newText = text.substring(0, start) + variable + text.substring(end);

            setFormData(prev => ({...prev, messageTemplate: newText}));

            // Restore cursor position
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + variable.length, start + variable.length);
            }, 0);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">{isEditMode ? 'Edit Campaign' : 'Create New Campaign'}</h3>
                <p className="card-description">
                    {isEditMode
                        ? 'Update the campaign details. Name and message template cannot be changed.'
                        : 'Set up a new SMS marketing campaign with personalized messaging.'
                    }
                </p>
            </div>

            <form onSubmit={handleSubmit} className="card-content space-y-6">
                {/* Campaign Name */}
                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Campaign Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={cn(
                            'input',
                            errors.name && 'border-red-500 focus:ring-red-500'
                        )}
                        placeholder="Enter campaign name..."
                        disabled={loading || isEditMode}
                    />
                    {errors.name && (
                        <div className="flex items-center space-x-1 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4"/>
                            <span>{errors.name}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="messageTemplate" className="text-sm font-medium text-gray-700">
                        Message Template
                    </label>
                    <textarea
                        id="messageTemplate"
                        value={formData.messageTemplate}
                        onChange={(e) => handleInputChange('messageTemplate', e.target.value)}
                        className={cn(
                            'textarea min-h-[120px]',
                            errors.messageTemplate && 'border-red-500 focus:ring-red-500'
                        )}
                        placeholder="Hi {{first_name}}, we have a special offer just for you..."
                        disabled={loading || isEditMode}
                    />
                    {errors.messageTemplate && (
                        <div className="flex items-center space-x-1 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4"/>
                            <span>{errors.messageTemplate}</span>
                        </div>
                    )}

                    {/* Character count */}
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>{formData.messageTemplate.length} characters</span>
                        <span className={cn(
                            formData.messageTemplate.length > 160 && 'text-orange-600',
                            formData.messageTemplate.length > 320 && 'text-red-600'
                        )}>
              {formData.messageTemplate.length > 160
                  ? `${Math.ceil(formData.messageTemplate.length / 160)} SMS segments`
                  : '1 SMS segment'
              }
            </span>
                    </div>
                </div>

                {/* Campaign Description */}
                <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium text-gray-700">
                        Campaign Description
                    </label>
                    <textarea
                        id="description"
                        value={formData.campaignDetails || ''}
                        onChange={(e) => handleInputChange('campaignDetails', e.target.value)}
                        className="textarea min-h-[80px]"
                        placeholder="Enter campaign details..."
                        disabled={loading}
                        required={!isEditMode}
                    />
                </div>

                {/* Template Variables */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                        Available Variables
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {templateVariables.map(({variable, description}) => (
                            <button
                                key={variable}
                                type="button"
                                onClick={() => insertVariable(variable)}
                                className="flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={loading || isEditMode}
                            >
                                <div>
                                    <div className="text-sm font-mono text-blue-600">{variable}</div>
                                    <div className="text-xs text-gray-500">{description}</div>
                                </div>
                                <div className="text-xs text-gray-400">Click to insert</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview */}
                {formData.messageTemplate && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Preview
                        </label>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="text-sm text-gray-700">
                                {formData.messageTemplate
                                    .replace(/\{\{first_name\}\}/g, 'John')
                                    .replace(/\{\{last_name\}\}/g, 'Doe')
                                }
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        className="btn-outline"
                        disabled={loading}
                        onClick={() => {
                            setFormData({name: '', messageTemplate: '', campaignDetails: ''});
                            setErrors({});
                        }}
                    >
                        Clear
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading || (!isEditMode && (!formData.name.trim() || !formData.messageTemplate.trim()))}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {isEditMode ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2"/>
                                {isEditMode ? 'Update Campaign' : 'Create Campaign'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
