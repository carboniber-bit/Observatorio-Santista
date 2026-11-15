import type { MetadataRoute } from 'next'
import { PUBLIC_PATHS, absoluteUrl } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((p) => ({ url: absoluteUrl(p) }))
}
