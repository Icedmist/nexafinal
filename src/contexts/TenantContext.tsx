import React, { createContext, useContext } from 'react';
import { useTenant as useTenantHook } from '@/hooks/useTenant';
import type { Store } from '@/types/tenant';

interface TenantContextType {
  store: Store | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({
  store: null,
  loading: true,
  error: null,
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { store, loading, error } = useTenantHook();

  return (
    <TenantContext.Provider value={{ store, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
};
