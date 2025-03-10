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

interface SummaryState {
  isLoading: boolean;
  content: string | null;
  error: string | null;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [summary, setSummary] = useState<SummaryState>({
    isLoading: false,
    content: null,
    error: null
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

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

  const getSummary = async (text: string, fileName: string) => {
    try {
      setSummary({ isLoading: true, content: null, error: null });
      setSelectedFile(fileName);
      
      const response = await fetch('http://127.0.0.1:8000/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to get summary: ${errorData}`);
      }

      const data = await response.json();
      setSummary({
        isLoading: false,
        content: data.summary,
        error: null
      });
    } catch (error) {
      setSummary({
        isLoading: false,
        content: null,
        error: error instanceof Error ? error.message : 'Failed to get summary'
      });
    }
  };

  const handleSelection = (result: SearchResult) => {
    getSummary(result.payload.text, result.payload.name);
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
          handleSelection(results[selectedIndex]);
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
      <div className={styles.searchWrapper}>
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
        
        <div className={styles.resultsContainer}>
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
                      onClick={() => handleSelection(result)}
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

          {(summary.isLoading || summary.content || summary.error) && (
            <div className={styles.summaryPanel}>
              {summary.isLoading ? (
                <div className={styles.summaryLoading}>
                  Generating summary...
                </div>
              ) : summary.error ? (
                <div className={styles.summaryError}>
                  {summary.error}
                </div>
              ) : (
                <div className={styles.summaryContent}>
                  <h3>{selectedFile}</h3>
                  <p>{summary.content}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 