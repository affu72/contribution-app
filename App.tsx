
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
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

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
        console.log("GAPI client initialized");
        setIsGapiReady(true);
      } catch (err) {
        console.error('Gapi init error', err);
        setError("Google API initialization failed. Check your Internet connection.");
      }
    };

    const initGis = () => {
      if (!window.google || !CLIENT_ID) return;
      
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: async (resp: any) => {
            if (resp.error) {
              console.error("GIS Callback error:", resp.error);
              setError(`Google Auth Error: ${resp.error_description || resp.error}`);
              return;
            }
            await fetchUserProfile(resp.access_token);
            setError(null);
          },
        });
        setTokenClient(client);
        console.log("GIS Token client initialized");
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
      setError("Identity system is not ready. Please refresh the page.");
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
        setError("Session expired. Please sign in again.");
        setUser(null);
      } else if (err.status === 403) {
        setError("Permission Denied: Ensure this Sheet is shared with Editor access to your account.");
      } else {
        setError(`Data error: ${err.result?.error?.message || 'Check your Spreadsheet ID settings.'}`);
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
      setError("Save failed. Check Sheet permissions.");
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />
      
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-2 tracking-tight italic uppercase">Ledger 2025</h2>
            <p className="text-slate-500 max-w-xl text-lg">
              {user ? `Record log for ${currentMonth}` : "Securely sync contributions to your shared Google Sheet."}
            </p>
          </div>
          {user && (
            <div className="flex gap-2 items-center bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                Sync Active
              </span>
            </div>
          )}
        </section>

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 p-5 text-red-700 flex flex-col gap-3 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-1.5 rounded-lg text-red-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                </div>
                <span className="font-bold text-sm">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {error.includes("400") && (
              <p className="text-xs font-medium opacity-80">Check the help section below to authorize this domain.</p>
            )}
          </div>
        )}

        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm text-center px-4 max-w-3xl mx-auto border-b-4 border-b-emerald-100">
            <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner border border-emerald-100/50">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Vault Locked</h3>
            <p className="text-slate-500 max-w-sm mb-12 text-xl leading-relaxed">Please authenticate with Google to access the {APP_YEAR} contribution data.</p>
            
            <button 
              onClick={handleLogin}
              className="group bg-slate-900 text-white pl-8 pr-12 py-5 rounded-[2rem] text-xl font-black hover:bg-slate-800 transition-all flex items-center gap-5 shadow-2xl active:scale-95 mb-12"
            >
              <div className="bg-white p-1.5 rounded-xl">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#000">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
              </div>
              Unlock Ledger
            </button>

            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="group flex items-center gap-2 text-emerald-600 text-sm font-black uppercase tracking-widest hover:text-emerald-700 transition-all"
            >
              <svg className={`w-4 h-4 transition-transform ${showHelp ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
              </svg>
              Troubleshoot Login (Error 400)
            </button>

            {showHelp && (
              <div className="mt-8 bg-slate-50 border border-slate-200 p-8 rounded-[2rem] text-left w-full max-w-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <h4 className="font-black text-slate-900 uppercase tracking-tighter text-lg mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-emerald-600 text-white rounded-md flex items-center justify-center text-xs">!</span>
                  Fixing the 400 Error
                </h4>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed font-medium">
                  This "long" URL is your app's temporary home. Even if it looks weird, you <strong>must</strong> add it to your Google Cloud Console for security to pass.
                </p>
                
                <div className="mb-6">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Step 1: Copy this specific URL</span>
                  <div className="flex gap-2">
                    <code className="bg-white border-2 border-slate-200 p-3 rounded-xl flex-grow text-xs font-mono text-emerald-700 font-bold break-all shadow-sm">
                      {window.location.origin}
                    </code>
                    <button 
                      onClick={copyToClipboard}
                      className={`px-6 py-3 rounded-xl text-xs font-black transition-all shadow-md active:scale-90 ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="text-sm space-y-4 text-slate-700 font-medium">
                  <p><strong>Step 2:</strong> Open your <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-emerald-600 underline font-black hover:text-emerald-700">Google Credentials Panel</a>.</p>
                  <p><strong>Step 3:</strong> Click on your Client ID name.</p>
                  <p><strong>Step 4:</strong> Paste the URL above into both <strong>Authorized JavaScript origins</strong> AND <strong>Authorized redirect URIs</strong>.</p>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-[11px] text-emerald-800 italic">
                    Note: It usually takes <strong>3 to 5 minutes</strong> for Google to "learn" the new URL. Refresh this page after a few minutes.
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-8">
              <MonthSelector currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
              <div className="sticky top-24">
                <ContributionForm 
                  user={user} 
                  selectedMonth={currentMonth} 
                  onSubmit={handleAddContribution}
                  isLoading={isLoading}
                />
              </div>
            </div>

            <div className="lg:col-span-8">
              <ContributionsTable 
                contributions={contributions} 
                user={user}
                onEdit={handleEditContribution}
                onDelete={handleDeleteContribution}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-12 text-center mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">&copy; 2025 Ledger Sync &bull; Secure Sheets Protocol</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
