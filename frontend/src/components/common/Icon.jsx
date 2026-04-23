import * as LucideIcons from 'lucide-react';

export default function Icon({ name, size = 18, color = 'currentColor', className = '' }) {
  const LucideIcon = LucideIcons[name];
  if (!LucideIcon) return null;
  return (
    <LucideIcon
      size={size}
      color={color}
      className={`inline-block flex-shrink-0 ${className}`}
    />
  );
}
