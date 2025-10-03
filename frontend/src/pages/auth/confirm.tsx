import React, {useEffect, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {useAuth} from '@/lib/auth';
import {cn} from '@/lib/utils';
import {AlertCircle, CheckCircle, Mail, RefreshCw} from 'lucide-react';

export default function ConfirmSignUpPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {confirmSignUp, resendSignUpCode, isLoading} = useAuth();
    const email = searchParams.get('email');

    const [confirmationCode, setConfirmationCode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [confirmationSuccess, setConfirmationSuccess] = useState(false);
    const [resendMessage, setResendMessage] = useState('');

    useEffect(() => {
        if (!email) {
            navigate('/auth/signup');
        }
    }, [email, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!confirmationCode.trim()) {
            setError('Please enter the confirmation code');
            return;
        }

        if (!email) {
            setError('Email is missing. Please try signing up again.');
            return;
        }

        setIsSubmitting(true);

        try {
            await confirmSignUp(email as string, confirmationCode.trim());
            setConfirmationSuccess(true);
            setTimeout(() => {
                navigate('/auth/login');
            }, 2000);
        } catch (err: any) {
            console.error('Confirmation error:', err);
            setError(err.message || 'Failed to confirm account. Please check your code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendCode = async () => {
        if (!email) {
            setError('Email is missing. Please try signing up again.');
            return;
        }

        setIsResending(true);
        setError('');
        setResendMessage('');

        try {
            await resendSignUpCode(email as string);
            setResendMessage('Confirmation code sent! Check your email.');
        } catch (err: any) {
            console.error('Resend error:', err);
            setError(err.message || 'Failed to resend confirmation code.');
        } finally {
            setIsResending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (confirmationSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4"/>
                        <h2 className="text-3xl font-extrabold text-gray-900">
                            Account confirmed!
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Your account has been successfully verified. Redirecting to login...
                        </p>
                        <div className="mt-4">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                        Confirm your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter the confirmation code we sent to your email
                    </p>
                    {email && (
                        <p className="mt-1 text-center text-sm text-blue-600 font-medium">
                            Email: {email}
                        </p>
                    )}
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                            value={confirmationCode}
                            onChange={(e) => {
                                setConfirmationCode(e.target.value);
                                if (error) setError('');
                            }}
                            className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-lg tracking-widest"
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                            <AlertCircle className="h-4 w-4"/>
                            <span>{error}</span>
                        </div>
                    )}

                    {resendMessage && (
                        <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
                            <CheckCircle className="h-4 w-4"/>
                            <span>{resendMessage}</span>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting || !confirmationCode.trim()}
                            className={cn(
                                'group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                                isSubmitting || !confirmationCode.trim()
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            )}
                        >
                            {isSubmitting ? (
                                <>
                                    <div
                                        className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Confirming...
                                </>
                            ) : (
                                'Confirm Account'
                            )}
                        </button>
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={isResending}
                            className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            {isResending ? (
                                <>
                                    <RefreshCw className="h-4 w-4 inline mr-1 animate-spin"/>
                                    Resending...
                                </>
                            ) : (
                                "Didn't receive a code? Resend"
                            )}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link
                            to="/auth/signup"
                            className="text-sm font-medium text-gray-600 hover:text-gray-500"
                        >
                            Back to sign up
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}