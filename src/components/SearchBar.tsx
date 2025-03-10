import { useState, useEffect, useCallback, KeyboardEvent, useRef } from 'react';
import styles from './SearchBar.module.css';

interface SearchResult {
  id: string;
  score: number;
  payload: {
    path: string;
    name: string;
    directory: string;
    directory_hierarchy: string[];
    size: string;
    author: string | null;
    date_created: string;
    year: number;
    month: string;
    last_modified: string;
    last_accessed: string;
    extension: string;
    document_type: string | null;
    status: string | null;
    classification: string | null;
    department: string | null;
    language: string | null;
    text: string;
  };
}

interface SearchResponse {
  results: SearchResult[];
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchAPI = useCallback(async (searchQuery: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://127.0.0.1:8000/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      const data: SearchResponse = await response.json();
      setResults(data.results);
      setSelectedIndex(data.results.length > 0 ? 0 : -1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setSelectedIndex(-1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (query.trim()) {
        searchAPI(query);
        setShowDropdown(true);
      } else {
        setResults([]);
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [query, searchAPI]);

  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const dropdown = dropdownRef.current;
      const selectedElement = dropdown.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev < results.length - 1 ? prev + 1 : prev;
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev > 0 ? prev - 1 : prev;
          return next;
        });
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          setShowDropdown(false);
          setSelectedIndex(-1);
          setQuery(results[selectedIndex].payload.name);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        className={styles.searchInput}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        onFocus={() => {
          if (query.trim()) {
            setShowDropdown(true);
            if (results.length > 0 && selectedIndex === -1) {
              setSelectedIndex(0);
            }
          }
        }}
      />
      
      {showDropdown && (
        <div className={styles.dropdown}>
          {isLoading ? (
            <div className={styles.noResults}>Loading...</div>
          ) : results.length > 0 ? (
            <div ref={dropdownRef}>
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className={`${styles.dropdownItem} ${index === selectedIndex ? styles.selected : ''}`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseLeave={() => setSelectedIndex(selectedIndex)}
                >
                  <div className={styles.resultHeader}>
                    <span className={styles.fileName}>{result.payload.name}</span>
                    <div className={styles.badgeContainer}>
                      <span className={styles.fileType}>{result.payload.extension}</span>
                      <span className={styles.score}>{Math.round(result.score * 100)}%</span>
                    </div>
                  </div>
                  <div className={styles.resultMeta}>
                    {result.payload.author && (
                      <span className={styles.metaItem}>
                        Author: {result.payload.author}
                      </span>
                    )}
                    {result.payload.date_created && (
                      <span className={styles.metaItem}>
                        Created: {formatDate(result.payload.date_created)}
                      </span>
                    )}
                    <span className={styles.metaItem}>
                      Size: {result.payload.size}
                    </span>
                  </div>
                  <div className={styles.resultPreview}>{result.payload.text.substring(0, 150)}...</div>
                  <div className={styles.resultPath}>
                    {result.payload.directory_hierarchy.join(' / ')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            query.trim() && <div className={styles.noResults}>No results found</div>
          )}
        </div>
      )}
    </div>
  );
} 