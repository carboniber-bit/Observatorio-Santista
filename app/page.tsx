import { BRAND_NAME } from '@/lib/brand';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">{BRAND_NAME}</h1>
    </main>
  );
}
