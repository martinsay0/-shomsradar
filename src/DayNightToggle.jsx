import React from 'react';
import { Sun, Moon } from 'lucide-react';

const DayNightToggle = ({ isNightMode, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            className={`
        relative flex items-center w-20 h-10 rounded-full p-1 transition-all duration-300 shadow-inner
        ${isNightMode ? 'bg-slate-700' : 'bg-sky-200'}
      `}
            aria-label="Toggle Day/Night Mode"
        >
            <div
                className={`
          absolute flex items-center justify-center w-8 h-8 rounded-full shadow-md transition-all duration-300 transform
          ${isNightMode ? 'bg-slate-800 translate-x-10' : 'bg-white translate-x-0'}
        `}
            >
                {isNightMode ? (
                    <Moon className="w-5 h-5 text-indigo-300" />
                ) : (
                    <Sun className="w-5 h-5 text-amber-500" />
                )}
            </div>

            {/* Background Icons/Decorations */}
            <div className={`absolute left-2 transition-opacity duration-300 ${isNightMode ? 'opacity-0' : 'opacity-100'}`}>
                {/* Sun position */}
            </div>
            <div className={`absolute right-2 transition-opacity duration-300 ${isNightMode ? 'opacity-100' : 'opacity-0'}`}>
                {/* Moon position */}
            </div>
        </button>
    );
};

export default DayNightToggle;
