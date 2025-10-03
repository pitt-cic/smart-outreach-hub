import React, {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import {
    AuthUser,
    confirmResetPassword,
    confirmSignIn,
    confirmSignUp,
    getCurrentUser,
    resendSignUpCode,
    resetPassword,
    signIn,
    signOut,
    signUp
} from 'aws-amplify/auth';
import {Hub} from 'aws-amplify/utils';

export interface SignInResult {
    isSignedIn: boolean;
    nextStep?: {
        signInStep: string;
        missingAttributes?: string[];
    };
}

export interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (username: string, password: string) => Promise<SignInResult>;
    signUp: (username: string, password: string, email: string, givenName: string, familyName: string) => Promise<void>;
    confirmSignUp: (username: string, confirmationCode: string) => Promise<void>;
    resendSignUpCode: (username: string) => Promise<void>;
    confirmSignIn: (challengeResponse: string, userAttributes?: Record<string, string>) => Promise<void>;
    resetPassword: (username: string) => Promise<void>;
    confirmResetPassword: (username: string, confirmationCode: string, newPassword: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuthState = async () => {
        try {
            setIsLoading(true);
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuthState();

        // Listen for auth events
        const hubListenerCancel = Hub.listen('auth', ({payload}) => {
            switch (payload.event) {
                case 'signedIn':
                    console.log('User signed in');
                    checkAuthState();
                    break;
                case 'signedOut':
                    console.log('User signed out');
                    setUser(null);
                    break;
                case 'tokenRefresh':
                    console.log('Token refreshed');
                    break;
                case 'tokenRefresh_failure':
                    console.log('Token refresh failed');
                    setUser(null);
                    break;
                default:
                    break;
            }
        });

        return () => {
            if (hubListenerCancel) {
                hubListenerCancel();
            }
        };
    }, []);

    const handleSignIn = async (username: string, password: string): Promise<SignInResult> => {
        try {
            const result = await signIn({username, password});

            if (result.isSignedIn) {
                await checkAuthState();
                return {isSignedIn: true};
            } else {
                return {
                    isSignedIn: false,
                    nextStep: result.nextStep
                };
            }
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    };

    const handleSignUp = async (
        username: string,
        password: string,
        email: string,
        givenName: string,
        familyName: string
    ): Promise<void> => {
        try {
            await signUp({
                username,
                password,
                options: {
                    userAttributes: {
                        email,
                        given_name: givenName,
                        family_name: familyName,
                    },
                },
            });
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    };

    const handleConfirmSignUp = async (username: string, confirmationCode: string): Promise<void> => {
        try {
            await confirmSignUp({username, confirmationCode});
        } catch (error) {
            console.error('Confirm sign up error:', error);
            throw error;
        }
    };

    const handleResendSignUpCode = async (username: string): Promise<void> => {
        try {
            await resendSignUpCode({username});
        } catch (error) {
            console.error('Resend sign up code error:', error);
            throw error;
        }
    };

    const handleConfirmSignIn = async (challengeResponse: string, userAttributes?: Record<string, string>): Promise<void> => {
        try {
            if (userAttributes && Object.keys(userAttributes).length > 0) {
                await confirmSignIn({
                    challengeResponse,
                    options: {
                        userAttributes
                    }
                });
            } else {
                await confirmSignIn({challengeResponse});
            }
            await checkAuthState();
        } catch (error) {
            console.error('Confirm sign in error:', error);
            throw error;
        }
    };

    const handleResetPassword = async (username: string): Promise<void> => {
        try {
            await resetPassword({username});
        } catch (error) {
            console.error('Reset password error:', error);
            throw error;
        }
    };

    const handleConfirmResetPassword = async (username: string, confirmationCode: string, newPassword: string): Promise<void> => {
        try {
            await confirmResetPassword({username, confirmationCode, newPassword});
        } catch (error) {
            console.error('Confirm reset password error:', error);
            throw error;
        }
    };

    const handleSignOut = async (): Promise<void> => {
        try {
            await signOut();
            setUser(null);
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };

    const refreshUser = async (): Promise<void> => {
        await checkAuthState();
    };

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn: handleSignIn,
        signUp: handleSignUp,
        confirmSignUp: handleConfirmSignUp,
        resendSignUpCode: handleResendSignUpCode,
        confirmSignIn: handleConfirmSignIn,
        resetPassword: handleResetPassword,
        confirmResetPassword: handleConfirmResetPassword,
        signOut: handleSignOut,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};