import { useEffect } from 'react';
import { navigate } from '../router';

/**
 * Det egne avhengighetskartet er slått sammen med påvirkningsanalysen (kartvisningen der).
 * Gamle lenker til #/kart sendes videre, med valgt objekt.
 */
export default function MapPage({ query }: { query: URLSearchParams }) {
  const node = query.get('node') ?? undefined;
  useEffect(() => {
    navigate('analysis', { visning: 'kart', node }, true);
  }, [node]);
  return null;
}
