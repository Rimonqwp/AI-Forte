import { createContext, useContext } from 'react';

// Keep the shared identity separate from dialogs that consume account state.
export const AccountContext = createContext(null);
export function useAccount() { return useContext(AccountContext); }
