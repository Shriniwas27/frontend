import { ShieldCheck } from 'lucide-react';

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <ShieldCheck />
    </span>
  );
}

export default function Brand() {
  return (
    <span className="brand">
      <BrandMark />
      <span className="brand-name">Vantome</span>
    </span>
  );
}
