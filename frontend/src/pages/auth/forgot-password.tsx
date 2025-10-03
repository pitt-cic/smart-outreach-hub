import React, {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useAuth} from '@/lib/auth';
import {cn} from '@/lib/utils';
import {AlertCircle, ArrowLeft, Eye, EyeOff, Lock, Mail} from 'lucide-react';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const {resetPassword, confirmResetPassword} = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        confirmationCode: '',
        newPassword: '',
        confirmNewPassword: '',
    });
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'request' | 'confirm'>('request');

    const handleInputChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
        if (error) setError('');
        if (success) setSuccess('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            if (step === 'request') {
                await resetPassword(formData.email);
                setSuccess('Password reset code sent to your email. Please check your inbox.');
                setStep('confirm');
            } else {
                if (formData.newPassword !== formData.confirmNewPassword) {
                    setError('New passwords do not match.');
                    setIsSubmitting(false);
                    return;
                }

                if (formData.newPassword.length < 8) {
                    setError('New password must be at least 8 characters long.');
                    setIsSubmitting(false);
                    return;
                }

                await confirmResetPassword(formData.email, formData.confirmationCode, formData.newPassword);
                setSuccess('Password reset successfully! Redirecting to login...');

                // Redirect to login after a short delay
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } catch (err: any) {
            console.error('Forgot password error:', err);
            setError(err.message || 'Failed to process password reset request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackToRequest = () => {
        setStep('request');
        setError('');
        setSuccess('');
        setFormData(prev => ({
            ...prev,
            confirmationCode: '',
            newPassword: '',
            confirmNewPassword: ''
        }));
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="flex justify-center">
                        <div className="flex items-center space-x-2">
                            <Mail className="h-8 w-8 text-blue-600"/>
                            <span className="text-2xl font-bold text-gray-900">Smart Outreach Hub</span>
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {step === 'request' ? 'Reset your password' : 'Enter new password'}
                    </h2>
                    {step === 'request' && (
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Enter your email address and we'll send you a password reset code.
                        </p>
                    )}
                    {step === 'confirm' && (
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Enter the confirmation code sent to your email and your new password.
                        </p>
                    )}
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Email field */}
                        <div>
                            <label htmlFor="email" className="sr-only">
                                Email address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400"/>
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className="appearance-none rounded-md relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Email address"
                                    disabled={step === 'confirm'}
                                />
                            </div>
                        </div>

                        {step === 'confirm' && (
                            <>
                                {/* Confirmation code field */}
                                <div>
                                    <label htmlFor="confirmationCode" className="sr-only">
                                        Confirmation Code
                                    </label>
                                    <input
                                        id="confirmationCode"
                                        name="confirmationCode"
                                        type="text"
                                        autoComplete="one-time-code"
                                        required
                                        value={formData.confirmationCode}
                                        onChange={(e) => handleInputChange('confirmationCode', e.target.value)}
                                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                        placeholder="Confirmation code"
                                    />
                                </div>

                                {/* New password field */}
                                <div>
                                    <label htmlFor="newPassword" className="sr-only">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400"/>
                                        </div>
                                        <input
                                            id="newPassword"
                                            name="newPassword"
                                            type={showNewPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            value={formData.newPassword}
                                            onChange={(e) => handleInputChange('newPassword', e.target.value)}
                                            className="appearance-none rounded-md relative block w-full pl-10 pr-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                            placeholder="New Password (min. 8 characters)"
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                        >
                                            {showNewPassword ? (
                                                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500"/>
                                            ) : (
                                                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500"/>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm new password field */}
                                <div>
                                    <label htmlFor="confirmNewPassword" className="sr-only">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400"/>
                                        </div>
                                        <input
                                            id="confirmNewPassword"
                                            name="confirmNewPassword"
                                            type={showConfirmNewPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            value={formData.confirmNewPassword}
                                            onChange={(e) => handleInputChange('confirmNewPassword', e.target.value)}
                                            className="appearance-none rounded-md relative block w-full pl-10 pr-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                            placeholder="Confirm New Password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                        >
                                            {showConfirmNewPassword ? (
                                                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500"/>
                                            ) : (
                                                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500"/>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                            <AlertCircle className="h-4 w-4"/>
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
                            <AlertCircle className="h-4 w-4"/>
                            <span>{success}</span>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting || (
                                step === 'request'
                                    ? !formData.email
                                    : (!formData.email || !formData.confirmationCode || !formData.newPassword || !formData.confirmNewPassword)
                            )}
                            className={cn(
                                'group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                                isSubmitting || (
                                    step === 'request'
                                        ? !formData.email
                                        : (!formData.email || !formData.confirmationCode || !formData.newPassword || !formData.confirmNewPassword)
                                )
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            )}
                        >
                            {isSubmitting ? (
                                <>
                                    <div
                                        className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    {step === 'request' ? 'Sending code...' : 'Resetting password...'}
                                </>
                            ) : (
                                step === 'request' ? 'Send Reset Code' : 'Reset Password'
                            )}
                        </button>
                    </div>

                    {/* Navigation links */}
                    <div className="text-center space-y-2">
                        {step === 'confirm' && (
                            <button
                                type="button"
                                onClick={handleBackToRequest}
                                className="text-sm text-blue-600 hover:text-blue-500 flex items-center justify-center space-x-1"
                            >
                                <ArrowLeft className="h-4 w-4"/>
                                <span>Back to email entry</span>
                            </button>
                        )}
                        <Link
                            to="/login"
                            className="text-sm text-blue-600 hover:text-blue-500 block"
                        >
                            Back to sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
