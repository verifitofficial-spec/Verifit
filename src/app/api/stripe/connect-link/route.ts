import { leadMvpUnavailable } from '@/app/lib/leadMvpUnavailable';

export async function POST() {
  return leadMvpUnavailable();
}
