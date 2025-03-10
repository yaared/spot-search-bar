import { useState, useEffect, useCallback } from 'react';
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

  const searchAPI = useCallback(async (searchQuery: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://127.0.0.1:8000/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      const data: SearchResponse = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
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
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [query, searchAPI]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleItemClick = (result: SearchResult) => {
    setQuery(result.payload.name);
    setShowDropdown(false);
    // Add any additional handling here
  };

  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        className={styles.searchInput}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        onFocus={() => query.trim() && setShowDropdown(true)}
      />
      
      {showDropdown && (
        <div className={styles.dropdown}>
          {isLoading ? (
            <div className={styles.noResults}>Loading...</div>
          ) : results.length > 0 ? (
            results.map((result) => (
              <div
                key={result.id}
                className={styles.dropdownItem}
                onClick={() => handleItemClick(result)}
              >
                <div className={styles.resultHeader}>
                  <span className={styles.fileName}>{result.payload.name}</span>
                  <span className={styles.fileType}>{result.payload.extension}</span>
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
            ))
          ) : (
            query.trim() && <div className={styles.noResults}>No results found</div>
          )}
        </div>
      )}
    </div>
  );
} 