// src/components/ui/SkeletonLoader.tsx
// Loading skeleton components

import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

export const StatCardSkeleton: React.FC = () => (
  <div className="glass-card p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
    <Skeleton className="h-8 w-20 mb-2" />
    <Skeleton className="h-3 w-32" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => (
  <div className="table-container">
    <table>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i}><Skeleton className="h-4 w-20" /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j}><Skeleton className="h-4 w-full" /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const CardSkeleton: React.FC = () => (
  <div className="glass-card p-6 space-y-4">
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-4 w-4/6" />
  </div>
);
