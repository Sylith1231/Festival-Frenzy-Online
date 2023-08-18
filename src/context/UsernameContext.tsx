import { Dispatch, FC, ReactNode, SetStateAction, createContext, useState } from 'react';

interface UsernameContextType {
  username: string;
  setUsername: Dispatch<SetStateAction<string>>;
}

export const UsernameContext = createContext<UsernameContextType>({ username: '', setUsername: () => {} });

interface props {
  children: ReactNode;
}

export const UsernameContextProvider: FC<props> = function ({ children }) {
  const [username, setUsername] = useState<string>(sessionStorage.getItem('username') ?? '');

  return <UsernameContext.Provider value={{ username, setUsername }}>{children}</UsernameContext.Provider>;
};
