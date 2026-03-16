import { Globe, Activity, Server, ShieldCheck, Heart } from 'lucide-react';

interface MonitorTypeIconProps {
  type: string;
  className?: string;
}

export default function MonitorTypeIcon({ type, className }: MonitorTypeIconProps) {
  switch (type) {
    case 'http':
    case 'keyword':
      return <Globe className={className} />;
    case 'ping':
      return <Activity className={className} />;
    case 'port':
      return <Server className={className} />;
    case 'ssl':
      return <ShieldCheck className={className} />;
    case 'heartbeat':
      return <Heart className={className} />;
    default:
      return <Globe className={className} />;
  }
}
