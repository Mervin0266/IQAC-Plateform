import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { searchItems, SearchItem } from '../data/searchIndex';

interface SearchBarProps {
  onNavigate?: (page: string) => void;
  className?: string;
  placeholder?: string;
}

export function SearchBar({ onNavigate, className = '', placeholder = 'Search' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(SearchItem & { score: number })[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length > 0) {
      const searchResults = searchItems(query);
      setResults(searchResults);
      setShowResults(true);
      setSelectedIndex(0);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query]);

  // Handle click outside to close results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (item: SearchItem) => {
    onNavigate?.(item.page);
    setQuery('');
    setShowResults(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        inputRef.current?.blur();
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Main': 'bg-blue-100 text-blue-700',
      'Records': 'bg-green-100 text-green-700',
      'Academic': 'bg-purple-100 text-purple-700',
      'Accreditation': 'bg-orange-100 text-orange-700',
      'Management': 'bg-pink-100 text-pink-700',
      'Administration': 'bg-red-100 text-red-700',
      'Research': 'bg-indigo-100 text-indigo-700',
      'Planning': 'bg-teal-100 text-teal-700',
      'Rankings': 'bg-yellow-100 text-yellow-700',
      'People': 'bg-cyan-100 text-cyan-700',
      'Department': 'bg-violet-100 text-violet-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length > 0) {
              setShowResults(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 text-sm bg-[#243a7a] text-white placeholder-blue-300 border border-blue-700/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
          <div className="p-2">
            <div className="text-xs text-gray-500 px-3 py-2 font-medium">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
            {results.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleResultClick(item)}
                className={`w-full text-left px-3 py-3 rounded-md transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 border-l-2 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {showResults && query.trim().length > 0 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 text-center">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No results found for "{query}"</p>
            <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
          </div>
        </div>
      )}
    </div>
  );
}
