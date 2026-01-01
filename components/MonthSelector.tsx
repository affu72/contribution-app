
import React from 'react';
import { Month } from '../types';
import { MONTHS } from '../constants';

interface MonthSelectorProps {
  currentMonth: Month;
  onMonthChange: (month: Month) => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({ currentMonth, onMonthChange }) => {
  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      <label htmlFor="month-select" className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
        Viewing Month
      </label>
      <div className="relative">
        <select
          id="month-select"
          value={currentMonth}
          onChange={(e) => onMonthChange(e.target.value as Month)}
          className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 pr-10 font-medium"
        >
          {MONTHS.map((month) => (
            <option key={month} value={month}>
              {month} 2025
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default MonthSelector;
