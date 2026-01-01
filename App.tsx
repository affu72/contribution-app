
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MonthSelector from './components/MonthSelector';
import ContributionForm from './components/ContributionForm';
import ContributionsTable from './components/ContributionsTable';
import { User, Contribution, Month } from './types';
import { MONTHS, APP_YEAR, CLIENT_ID, DISCOVERY_DOC, SCOPES, SPREADSHEET_ID } from './constants';
import { sheetsService } from './services/sheetsService';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState<Month>(MONTHS[new Date().getMonth()]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);

  const fetchUserProfile = async (accessToken: string) => {
    try {
      const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const profile = await resp.json();
      const userData: User = {
        name: profile.name,
        email: profile.email,
        photoUrl: profile.picture
      };
      setUser(userData);
      localStorage.setItem('contribution_app_user', JSON.stringify(userData));
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    }
  };

  useEffect(() => {
    const initGapi = async () => {
      try {
        await new Promise((resolve) => window.gapi.load('client', resolve));
        await window.gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        setIsGapiReady(true);
      } catch (err) {
        console.error('Gapi init error', err);
        setError("Failed to initialize Google API. Please refresh.");
      }
    };

    const initGis = () => {
      if (!window.google || CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')) return;
      
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: async (resp: any) => {
            if (resp.error) {
              setError(`Login Error: ${resp.error}`);
              setShowTroubleshooter(true);
              return;
            }
            await fetchUserProfile(resp.access_token);
            setError(null);
            setShowTroubleshooter(false);
          },
        });
        setTokenClient(client);
      } catch (e) {
        console.error("GIS Init error", e);
      }
    };

    if (window.gapi) initGapi();
    if (window.google) initGis();
  }, []);

  const handleLogin = () => {
    if (tokenClient) {
      setError(null);
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      setError("Google Identity Client is not ready. If you just updated the code, please wait a few seconds and refresh.");
      setShowTroubleshooter(true);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('contribution_app_user');
    const token = window.gapi.client.getToken();
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken(null);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('contribution_app_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const fetchMonthData = useCallback(async (month: Month) => {
    const token = window.gapi.client.getToken();
    if (!isGapiReady || !token) {
      setContributions([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await sheetsService.fetchContributions(month);
      setContributions(data);
      setError(null);
    } catch (err: any) {
      console.error('Fetch error:', err);
      if (err.status === 401) {
        setError("Your session has expired. Please sign in again.");
        setUser(null);
      } else if (err.status === 403) {
        setError("Access Denied: The spreadsheet isn't shared with the account you logged in with.");
      } else {
        setError(`Sheet error: ${err.result?.error?.message || 'Check if the Spreadsheet ID is correct and the sheet is shared.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isGapiReady]);

  useEffect(() => {
    if (isGapiReady && user) {
      fetchMonthData(currentMonth);
    }
  }, [currentMonth, fetchMonthData, isGapiReady, user]);

  const handleAddContribution = async (amount: number, note: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await sheetsService.addContribution({
        userEmail: user.email,
        userName: user.name,
        amount,
        note,
        month: currentMonth,
        year: APP_YEAR
      });
      await fetchMonthData(currentMonth);
    } catch (err) {
      setError("Failed to save. Make sure you have 'Editor' access to the Google Sheet.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditContribution = async (id: string, updates: Partial<Contribution>) => {
    setIsLoading(true);
    try {
      await sheetsService.updateContribution(id, updates, currentMonth);
      await fetchMonthData(currentMonth);
    } catch (err) {
      setError("Update failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContribution = async (id: string) => {
    if (!confirm("Remove this entry?")) return;
    setIsLoading(true);
    try {
      await sheetsService.deleteContribution(id, currentMonth);
      await fetchMonthData(currentMonth);
    } catch (err) {
      setError("Delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />
      
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-2 tracking-tight italic uppercase">Ledger 2025</h2>
            <p className="text-slate-500 max-w-xl text-lg">
              {user ? `Records for ${currentMonth}` : "Securely sync contributions to your shared Google Sheet."}
            </p>
          </div>
          {user && (
            <div className="flex gap-2 items-center bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                Authenticated
              </span>
            </div>
          )}
        </section>

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 p-5 text-red-700 flex flex-col gap-4 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                </div>
                <span className="font-bold text-sm">{error}</span>
              </div>
              <button onClick={() => { setError(null); setShowTroubleshooter(false); }} className="text-red-400 hover:text-red-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {(showTroubleshooter || error.includes("400")) && (
              <div className="bg-white p-5 rounded-xl text-sm space-y-4 border border-red-100 text-slate-700 shadow-inner">
                <div className="flex items-center gap-2 text-red-800 font-black uppercase tracking-tighter">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path></svg>
                  Fix "Error 400: invalid_request"
                </div>
                <p className="leading-relaxed">Google rejected the login because the current domain is not authorized. Follow these steps:</p>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">1. Copy this Origin URL</span>
                    <code className="bg-white px-2 py-1 rounded border border-slate-300 font-mono text-xs select-all text-blue-600 font-bold break-all">
                      {window.location.origin}
                    </code>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">2. Update Google Console</span>
                    <p className="text-xs">Go to your <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="underline font-bold text-emerald-600 hover:text-emerald-700">Credentials Page</a>, click your Client ID, and paste the URL above into <strong>Authorized JavaScript origins</strong>.</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">Note: Google can take up to 5 minutes to apply this change.</p>
              </div>
            )}
          </div>
        )}

        {!user ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-100 rounded-[2rem] shadow-sm text-center px-4">
            <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-lg">
              <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Access Restricted</h3>
            <p className="text-slate-500 max-w-sm mb-10 text-lg leading-relaxed">Sign in to sync with the Google Sheet. Your data is stored directly in your shared spreadsheet.</p>
            <button 
              onClick={handleLogin}
              className="group bg-slate-900 text-white pl-8 pr-10 py-5 rounded-3xl text-xl font-black hover:bg-slate-800 transition-all flex items-center gap-4 shadow-2xl hover:shadow-slate-300 active:scale-95"
            >
              <div className="bg-white p-2 rounded-xl group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#000">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,