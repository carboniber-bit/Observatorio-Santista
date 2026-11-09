import { INDEPENDENCE_SHORT } from '@/lib/brand';

export function IndependenceBanner() {
  return (
    <footer
      role="contentinfo"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-3 bg-ink px-4 py-2 text-center text-xs text-paper sm:text-sm"
    >
      <p className="mx-auto max-w-5xl">{INDEPENDENCE_SHORT}</p>
    </footer>
  );
}
