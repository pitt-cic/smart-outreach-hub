import React, {useRef, useState} from 'react';
import {ApiResponse, UploadResult} from '@/types';
import {cn} from '@/lib/utils';
import {getApiUrl, getAuthHeaders} from '@/lib/api-config';
import {AlertCircle, CheckCircle, Download, FileText, Upload, X} from 'lucide-react';

interface ContactUploadProps {
    campaignId: string;
    onUpload: (result: UploadResult) => void;
    loading?: boolean;
}

export default function ContactUpload({
                                          campaignId,
                                          onUpload,
                                          loading = false
                                      }: ContactUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file: File) => {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setError('Please upload a CSV file');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB');
            return;
        }

        setError('');
        setUploading(true);
        setUploadResult(null);

        try {
            // Read file as base64
            const fileContent = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    // Remove the data URL prefix to get just the base64 content
                    const base64Content = (reader.result as string).split(',')[1];
                    resolve(base64Content);
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(file);
            });

            const authHeaders = await getAuthHeaders();
            const uploadUrl = getApiUrl('/campaigns/upload');

            // Send as JSON with base64 content
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                },
                body: JSON.stringify({
                    campaignId,
                    csvContent: fileContent,
                    filename: file.name
                }),
            });

            const result: ApiResponse<UploadResult> = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            setUploadResult(result.data!);
            onUpload(result.data!);

        } catch (err) {
            console.error('Upload error:', err);
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        const csvContent = 'first_name,last_name,phone_number\nJohn,Doe,+1234567890\nJane,Smith,+1987654321';
        const blob = new Blob([csvContent], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'contacts_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const clearResults = () => {
        setUploadResult(null);
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Upload Contact List</h3>
                <p className="card-description">
                    Upload a CSV file with customer contact information.
                </p>
            </div>

            <div className="card-content space-y-6">
                {/* Template Download */}
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div>
                        <h4 className="text-sm font-medium text-blue-900">Need a template?</h4>
                        <p className="text-sm text-blue-700">
                            Download our CSV template with the required columns: first_name, last_name, phone_number
                        </p>
                    </div>
                    <button
                        onClick={downloadTemplate}
                        className="btn-outline text-blue-600 border-blue-300 hover:bg-blue-50"
                        disabled={uploading}
                    >
                        <Download className="h-4 w-4 mr-2"/>
                        Download Template
                    </button>
                </div>

                {/* Upload Area */}
                <div
                    className={cn(
                        'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                        dragActive
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400',
                        uploading && 'pointer-events-none opacity-50'
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileInput}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                    />

                    <div className="space-y-4">
                        {uploading ? (
                            <>
                                <div
                                    className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-sm text-gray-600">Processing your file...</p>
                            </>
                        ) : (
                            <>
                                <Upload className="h-12 w-12 text-gray-400 mx-auto"/>
                                <div>
                                    <p className="text-lg font-medium text-gray-900">
                                        Drop your CSV file here, or click to browse
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Supports CSV files up to 10MB
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FileText className="h-4 w-4 mr-2"/>
                                    Choose File
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0"/>
                        <div>
                            <p className="text-sm font-medium text-red-800">Upload Error</p>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                        <button
                            onClick={() => setError('')}
                            className="ml-auto text-red-500 hover:text-red-700"
                        >
                            <X className="h-4 w-4"/>
                        </button>
                    </div>
                )}

                {/* Upload Results */}
                {uploadResult && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-medium text-gray-900">Upload Results</h4>
                            <button
                                onClick={clearResults}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="h-4 w-4"/>
                            </button>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="text-2xl font-bold text-gray-900">
                                    {uploadResult.totalRows}
                                </div>
                                <div className="text-sm text-gray-600">Total Rows</div>
                            </div>

                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="text-2xl font-bold text-green-900">
                                    {uploadResult.validRows}
                                </div>
                                <div className="text-sm text-green-700">Valid Contacts</div>
                            </div>

                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="text-2xl font-bold text-red-900">
                                    {uploadResult.invalidRows}
                                </div>
                                <div className="text-sm text-red-700">Invalid Rows</div>
                            </div>
                        </div>

                        {/* Success Message */}
                        {uploadResult.validRows > 0 && (
                            <div
                                className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-500"/>
                                <div>
                                    <p className="text-sm font-medium text-green-800">
                                        Successfully processed {uploadResult.validRows} contacts
                                    </p>
                                    <p className="text-sm text-green-700">
                                        Your contacts have been added to the campaign and are ready to receive messages.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Errors */}
                        {uploadResult.errors.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-sm font-medium text-red-800">
                                    Issues found ({uploadResult.errors.length}):
                                </h5>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {uploadResult.errors.map((error, index) => (
                                        <div
                                            key={index}
                                            className="text-sm text-red-700 p-2 bg-red-50 border border-red-200 rounded"
                                        >
                                            {error}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Requirements */}
                <div className="text-xs text-gray-500 space-y-1">
                    <p className="font-medium">CSV Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Required columns: first_name, last_name, phone_number</li>
                        <li>Phone numbers should include country code (e.g., +1234567890)</li>
                        <li>First row should contain column headers</li>
                        <li>Maximum file size: 10MB</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
