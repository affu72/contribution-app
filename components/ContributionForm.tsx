
import React, { useState } from 'react';
import { User, Month } from '../types';
import { APP_YEAR } from '../constants';

interface ContributionFormProps {
  user: User | null;
  selectedMonth: Month;
  onSubmit: (amount: number, note: string) => void;
  isLoading: boolean;
}

const ContributionForm: React.FC<ContributionFormProps> = ({ user, selectedMonth, onSubmit, isLoading }) => {
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');

  if (!user) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center">
        <h3 className="text-emerald-900 font-bold mb-2">Want to contribute?</h3>
        <p className="text-emerald-700 text-sm mb-4">Please sign in with your Google account to record your contribution for {selectedMonth}.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    
    onSubmit(numAmount, note);
    setAmount('');
    setNote('');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h3 className="font-bold text-slate-900">Add Contribution</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">Contributor</label>
          <div className="text-sm font-medium text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {user.name} ({user.email})
          </div>
        </div>

        <div>
          <label htmlFor="amount" className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">Amount ($)</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            required
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 font-medium"
          />
        </div>

        <div>
          <label htmlFor="note" className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">Note (Optional)</label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What is this contribution for?"
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 font-medium resize-none h-20"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !amount}
          className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {isLoading ? 'Processing...' : `Submit to ${selectedMonth} Sheet`}
        </button>
      </form>
    </div>
  );
};

export default ContributionForm;
