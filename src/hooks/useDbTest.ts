import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useDbTest() {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const test = async () => {
    try {
      const rowId = await invoke<number>('test_db_write');
      setResult(`Wrote row ID: ${rowId}`);
    } catch (e) {
      setError(String(e));
    }
  };

  return { test, result, error };
}
