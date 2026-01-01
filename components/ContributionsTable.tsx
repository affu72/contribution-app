
import React, { useState } from 'react';
import { Contribution, User } from '../types';
import { formatCurrency } from '../utils';

interface ContributionsTableProps {
  contributions: Contribution[];
  user: User | null;
  onEdit: (id: string, updates: Partial<Contribution>) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

const ContributionsTable: React.FC<ContributionsTableProps> = ({ contributions, user, onEdit, onDelete, isLoading }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  const startEdit = (contribution: Contribution) => {
    setEditingId(contribution.id);
    setEditAmount(contribution.amount.toString());
    setEditNote(contribution.note);
  };

  const handleSave = () => {
    if (editingId) {
      onEdit(editingId, { amount: parseFloat(editAmount), note: editNote });
      setEditingId(null);
    }
  };

  if (isLoading && contributions.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Loading contributions...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-tight">Contributor</th>
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-tight">Amount</th>
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-tight">Note</th>
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-tight text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contributions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No contributions found for this month yet.
                </td>
              </tr>
            ) : (
              contributions.map((contribution) => {
                const isOwner = user?.email === contribution.userEmail;
                const isEditing = editingId === contribution.id;

                return (
                  <tr 
                    key={contribution.id} 
                    className={`transition-colors ${isOwner ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{contribution.userName}</div>
                      <div className="text-xs text-slate-500">{contribution.userEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-24 p-1 border rounded"
                        />
                      ) : (
                        <span className="font-bold text-emerald-600">{formatCurrency(contribution.amount)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="w-full p-1 border rounded"
                        />
                      ) : (
                        contribution.note || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isOwner && (
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button 
                                onClick={handleSave}
                                className="text-emerald-600 hover:text-emerald-700 font-bold"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingId(null)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => startEdit(contribution)}
                                className="text-slate-400 hover:text-emerald-600 p-1"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button 
                                onClick={() => onDelete(contribution.id)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {!isOwner && (
                        <span className="text-slate-300 text-xs italic">View Only</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {contributions.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50/50 border-t border-slate-200">
                <td className="px-6 py-4 font-bold text-slate-900">Total</td>
                <td className="px-6 py-4 font-black text-emerald-700 text-lg">
                  {formatCurrency(contributions.reduce((acc, c) => acc + c.amount, 0))}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default ContributionsTable;
