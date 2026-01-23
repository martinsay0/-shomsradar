import React, { useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';

const SearchBar = ({ onSearch, onUseLocation }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        onSearch(query);
    };

    const handleLocationClick = () => {
        setLoading(true);
        // Simulate loading for better UX
        setTimeout(() => {
            onUseLocation();
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-md">
            <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-12 py-3 bg-white/95 backdrop-blur shadow-lg rounded-full text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-200 text-sm font-medium transition-all"
                    placeholder="Search street name (e.g. Fola Agoro)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button
                    type="button"
                    onClick={handleLocationClick}
                    className="absolute inset-y-0 right-1 pr-2 flex items-center"
                    title="Use my location"
                >
                    <div className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-indigo-600">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                    </div>
                </button>
            </form>
        </div>
    );
};

export default SearchBar;
