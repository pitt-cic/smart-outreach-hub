import React from 'react';
import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import {Provider} from 'urql';
import {graphqlClient} from '@/lib/graphql/client';
import {AuthProvider} from '@/lib/auth';
import '@/lib/amplify';

// Pages
import HomePage from '@/pages/index';
import LoginPage from '@/pages/auth/login';
import SignupPage from '@/pages/auth/signup';
import ConfirmPage from '@/pages/auth/confirm';
import ForgotPasswordPage from '@/pages/auth/forgot-password';
import CampaignsPage from '@/pages/campaigns/index';
import CustomersPage from '@/pages/customers/index';
import MessagesPage from '@/pages/messages/index';

export default function App() {
    return (
        <AuthProvider>
            <Provider value={graphqlClient}>
                <Router>
                    <Routes>
                        <Route path="/" element={<HomePage/>}/>
                        <Route path="/login" element={<LoginPage/>}/>
                        <Route path="/auth/login" element={<LoginPage/>}/>
                        <Route path="/auth/signup" element={<SignupPage/>}/>
                        <Route path="/auth/confirm" element={<ConfirmPage/>}/>
                        <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
                        <Route path="/auth/forgot-password" element={<ForgotPasswordPage/>}/>
                        <Route path="/campaigns" element={<CampaignsPage/>}/>
                        <Route path="/customers" element={<CustomersPage/>}/>
                        <Route path="/messages" element={<MessagesPage/>}/>
                    </Routes>
                </Router>
            </Provider>
        </AuthProvider>
    );
}