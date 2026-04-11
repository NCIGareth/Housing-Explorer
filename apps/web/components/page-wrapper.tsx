import { ReactNode, Suspense } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';

interface PageWrapperProps {
  children: ReactNode;
}

/**
 * REMOVED "use client"
 * By making this a Server Component, we allow the children 
 * (like your Home page) to stay as Server Components.
 */
export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Suspense fallback={
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f8fafc' 
        }}>
          <LoadingSpinner message="Querying Property Price Register & Live Feeds..." />
        </div>
      }>
        {children}
      </Suspense>
    </div>
  );
}