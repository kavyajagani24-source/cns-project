import type { RiskCategory } from '../types/api';

interface Props { category?: RiskCategory; size?: 'sm' | 'md' }

const config: Record<string, { label: string; icon: string; cls: string }> = {
  phishing:    { label: 'PHISHING',    icon: '🚨', cls: 'risk-phishing' },
  suspicious:  { label: 'SUSPICIOUS',  icon: '⚠️', cls: 'risk-suspicious' },
  safe:        { label: 'SAFE',        icon: '✅', cls: 'risk-safe' },
  inconclusive:{ label: 'INCONCLUSIVE',icon: '❓', cls: 'risk-inconclusive' },
};

export default function RiskBadge({ category, size = 'md' }: Props) {
  if (!category) return <span className="risk-badge risk-inconclusive">Unknown</span>;
  const c = config[category] || config.inconclusive;
  return (
    <span className={`risk-badge ${c.cls}`} style={size === 'sm' ? { fontSize: '10px', padding: '2px 8px' } : {}}>
      {c.icon} {c.label}
    </span>
  );
}
