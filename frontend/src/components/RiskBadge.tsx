import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert } from 'lucide-react';
import type { RiskCategory } from '../types/api';

interface Props { category?: RiskCategory; size?: 'sm' | 'md' }

const config: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  phishing:    {
    label: 'Phishing',
    icon: <ShieldAlert size={11} aria-hidden="true" />,
    cls: 'risk-phishing',
  },
  suspicious:  {
    label: 'Suspicious',
    icon: <AlertTriangle size={11} aria-hidden="true" />,
    cls: 'risk-suspicious',
  },
  safe:        {
    label: 'Safe',
    icon: <CheckCircle2 size={11} aria-hidden="true" />,
    cls: 'risk-safe',
  },
  inconclusive:{
    label: 'Inconclusive',
    icon: <HelpCircle size={11} aria-hidden="true" />,
    cls: 'risk-inconclusive',
  },
};

export default function RiskBadge({ category, size = 'md' }: Props) {
  if (!category) {
    return (
      <span className="risk-badge risk-inconclusive">
        <HelpCircle size={11} aria-hidden="true" /> Unknown
      </span>
    );
  }
  const c = config[category] || config.inconclusive;
  return (
    <span
      className={`risk-badge ${c.cls}`}
      style={size === 'sm' ? { fontSize: '10px', padding: '2px 7px' } : {}}
    >
      {c.icon} {c.label}
    </span>
  );
}
