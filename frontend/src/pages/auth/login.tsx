import React, {useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {SignInResult, useAuth} from '@/lib/auth';
import {cn} from '@/lib/utils';
import {AlertCircle, Eye, EyeOff, Lock, Mail} from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {signIn, confirmSignIn, resetPassword, confirmResetPassword, isLoading} = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        newPassword: '',
        confirmNewPassword: '',
        given_name: '',
        family_name: '',
        confirmationCode: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requiresNewPassword, setRequiresNewPassword] = useState(false);
    const [missingAttributes, setMissingAttributes] = useState<string[]>([]);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordStep, setForgotPasswordStep] = useState<'request' | 'confirm'>('request');

    const handleInputChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
        if (error) setError('');
        if (success) setSuccess('');
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            if (forgotPasswordStep === 'request') {
                await resetPassword(formData.email);
                setSuccess('Password reset code sent to your email. Please check your inbox.');
                setForgotPasswordStep('confirm');
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
                setSuccess('Password reset successfully! You can now sign in with your new password.');

                // Reset form and go back to login
                setShowForgotPassword(false);
                setForgotPasswordStep('request');
                setFormData(prev => ({
                    ...prev,
                    newPassword: '',
                    confirmNewPassword: '',
                    confirmationCode: ''
                }));
            }
        } catch (err: any) {
            console.error('Forgot password error:', err);
            setError(err.message || 'Failed to process password reset request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackToLogin = () => {
        setShowForgotPassword(false);
        setForgotPasswordStep('request');
        setError('');
        setSuccess('');
        setFormData(prev => ({
            ...prev,
            newPassword: '',
            confirmNewPassword: '',
            confirmationCode: ''
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Handle forgot password flow
        if (showForgotPassword) {
            return handleForgotPassword(e);
        }

        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            if (requiresNewPassword) {
                // Handle new password submission
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

                const userAttributes: Record<string, string> = {};
                missingAttributes.forEach(attr => {
                    if (formData[attr as keyof typeof formData]) {
                        userAttributes[attr] = formData[attr as keyof typeof formData];
                    }
                });

                await confirmSignIn(formData.newPassword, Object.keys(userAttributes).length > 0 ? userAttributes : undefined);

                // Redirect to return URL or dashboard
                const returnUrl = searchParams.get('returnUrl');
                navigate(returnUrl || '/');
            } else {
                // Handle initial sign in
                const result: SignInResult = await signIn(formData.email, formData.password);

                if (result.isSignedIn) {
                    // Redirect to return URL or dashboard
                    const returnUrl = searchParams.get('returnUrl');
                    navigate(returnUrl || '/');
                } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
                    setRequiresNewPassword(true);
                    if (result.nextStep.missingAttributes) {
                        setMissingAttributes(result.nextStep.missingAttributes);
                    }
                }
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                        {showForgotPassword
                            ? (forgotPasswordStep === 'request' ? 'Reset your password' : 'Enter new password')
                            : (requiresNewPassword ? 'Set New Password' : 'Sign in to your account')
                        }
                    </h2>
                    {showForgotPassword && forgotPasswordStep === 'request' && (
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Enter your email address and we'll send you a password reset code.
                        </p>
                    )}
                    {showForgotPassword && forgotPasswordStep === 'confirm' && (
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Enter the confirmation code sent to your email and your new password.
                        </p>
                    )}
                    {requiresNewPassword && !showForgotPassword && (
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Your account requires a new
                            password{missingAttributes.length > 0 ? ' and some additional information' : ''}. Please
                            complete the form below.
                        </p>
                    )}
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {showForgotPassword ? (
                            <>
                                {/* Email field for forgot password */}
                                <div>
                                    <label htmlFor="email" className="sr-only">
                                        Email address
                                    </label>
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
                                            disabled={forgotPasswordStep === 'confirm'}
                                        />
                                    </div>
                                </div>

                                {forgotPasswordStep === 'confirm' && (
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
                            </>
                        ) : !requiresNewPassword ? (
                            <>
                                <div>
                                    <label htmlFor="email" className="sr-only">
                                        Email address
                                    </label>
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className="sr-only">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400"/>
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            required
                                            value={formData.password}
                                            onChange={(e) => handleInputChange('password', e.target.value)}
                                            className="appearance-none rounded-md relative block w-full pl-10 pr-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                            placeholder="Password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500"/>
                                            ) : (
                                                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500"/>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
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

                                {missingAttributes.includes('given_name') && (
                                    <div>
                                        <label htmlFor="given_name" className="sr-only">
                                            First Name
                                        </label>
                                        <input
                                            id="given_name"
                                            name="given_name"
                                            type="text"
                                            autoComplete="given-name"
                                            required
                                            value={formData.given_name}
                                            onChange={(e) => handleInputChange('given_name', e.target.value)}
                                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                            placeholder="First Name"
                                        />
                                    </div>
                                )}

                                {missingAttributes.includes('family_name') && (
                                    <div>
                                        <label htmlFor="family_name" className="sr-only">
                                            Last Name
                                        </label>
                                        <input
                                            id="family_name"
                                            name="family_name"
                                            type="text"
                                            autoComplete="family-name"
                                            required
                                            value={formData.family_name}
                                            onChange={(e) => handleInputChange('family_name', e.target.value)}
                                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                            placeholder="Last Name"
                                        />
                                    </div>
                                )}
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
                                showForgotPassword
                                    ? (forgotPasswordStep === 'request'
                                            ? !formData.email
                                            : (!formData.email || !formData.confirmationCode || !formData.newPassword || !formData.confirmNewPassword)
                                    )
                                    : (!requiresNewPassword
                                            ? (!formData.email || !formData.password)
                                            : (!formData.newPassword || !formData.confirmNewPassword || (missingAttributes.includes('given_name') && !formData.given_name) || (missingAttributes.includes('family_name') && !formData.family_name))
                                    )
                            )}
                            className={cn(
                                'group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                                isSubmitting || (
                                    showForgotPassword
                                        ? (forgotPasswordStep === 'request'
                                                ? !formData.email
                                                : (!formData.email || !formData.confirmationCode || !formData.newPassword || !formData.confirmNewPassword)
                                        )
                                        : (!requiresNewPassword
                                                ? (!formData.email || !formData.password)
                                                : (!formData.newPassword || !formData.confirmNewPassword || (missingAttributes.includes('given_name') && !formData.given_name) || (missingAttributes.includes('family_name') && !formData.family_name))
                                        )
                                )
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            )}
                        >
                            {isSubmitting ? (
                                <>
                                    <div
                                        className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    {showForgotPassword
                                        ? (forgotPasswordStep === 'request' ? 'Sending code...' : 'Resetting password...')
                                        : (requiresNewPassword ? 'Setting new password...' : 'Signing in...')
                                    }
                                </>
                            ) : (
                                showForgotPassword
                                    ? (forgotPasswordStep === 'request' ? 'Send Reset Code' : 'Reset Password')
                                    : (requiresNewPassword ? 'Set New Password' : 'Sign in')
                            )}
                        </button>
                    </div>

                    {/* Forgot password and back to login links */}
                    {!requiresNewPassword && (
                        <div className="text-center space-y-2">
                            {!showForgotPassword ? (
                                <div className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotPassword(true)}
                                        className="text-sm text-blue-600 hover:text-blue-500 block"
                                    >
                                        Forgot your password?
                                    </button>
                                    <Link
                                        to="/forgot-password"
                                        className="text-xs text-gray-500 hover:text-gray-700 block"
                                    >
                                        Or use the dedicated reset page
                                    </Link>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleBackToLogin}
                                    className="text-sm text-blue-600 hover:text-blue-500"
                                >
                                    Back to sign in
                                </button>
                            )}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}