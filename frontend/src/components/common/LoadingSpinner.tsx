import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={cn(
          'animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent',
          sizeClasses[size],
          className
        )}
      />
    </div>
  );
}