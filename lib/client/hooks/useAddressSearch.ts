/**
 * 주소 검색 Hook
 */

import { useState } from 'react';
import { AddressAPI } from '@/lib/client/api/address.api';
import type { AddressSearchResult } from '@/types/address';

interface UseAddressSearchReturn {
  results: AddressSearchResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

export function useAddressSearch(): UseAddressSearchReturn {
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string) => {
    if (!query.trim()) {
      setError('검색어를 입력해주세요');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await AddressAPI.search(query);

      setResults(data.data.results);

      if (data.data.results.length === 0) {
        setError('검색 결과가 없습니다');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '주소 검색에 실패했습니다');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clear = () => {
    setResults([]);
    setError(null);
  };

  return {
    results,
    isLoading,
    error,
    search,
    clear,
  };
}
