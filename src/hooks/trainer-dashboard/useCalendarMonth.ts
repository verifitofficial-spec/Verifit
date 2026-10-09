'use client';

import { useCallback, useState } from 'react';

export function useCalendarMonth() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const prev = useCallback(
    () => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 })),
    []
  );
  const next = useCallback(
    () => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 })),
    []
  );

  return { year: cursor.year, month: cursor.month, prev, next };
}
