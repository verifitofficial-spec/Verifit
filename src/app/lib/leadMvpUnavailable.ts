import 'server-only';

import { NextResponse } from 'next/server';

/** Einheitliche harte Grenze für Funktionen außerhalb des aktuellen Lead-MVP. */
export function leadMvpUnavailable() {
  return NextResponse.json(
    { error: 'Diese Funktion ist im aktuellen Lead-MVP nicht verfügbar.' },
    {
      status: 410,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
