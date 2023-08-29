import { Dispatch, FC, ReactNode, SetStateAction, createContext, useState } from 'react';

interface TeamContextType {
  teamNumber: number;
  setTeamNumber: Dispatch<SetStateAction<number>>;
}

export const TeamContext = createContext<TeamContextType>({ teamNumber: 0, setTeamNumber: () => {} });

interface props {
  children: ReactNode;
}

export const TeamContextProvider: FC<props> = function ({ children }) {
  const [teamNumber, setTeamNumber] = useState<number>(Number(sessionStorage.getItem('teamNumber')) ?? 0);

  return <TeamContext.Provider value={{ teamNumber: teamNumber, setTeamNumber: setTeamNumber }}>{children}</TeamContext.Provider>;
};
