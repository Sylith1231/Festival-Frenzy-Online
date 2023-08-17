import { createHashRouter, RouterProvider } from 'react-router-dom';
import { UsernameContextProvider } from './context/UsernameContext';
import Landing from './pages/Landing';
import WaitingRoom, { loader as waitingRoomLoader } from './pages/WaitingRoom';
import Host from './pages/Host';
import Level from './pages/Level';
import Leaderboard from './pages/Leaderboard';

const router = createHashRouter(
  // const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Landing />,
    },
    // {
    //   path: '/test',
    //   element: <Test />,
    // },
    {
      path: '/waiting-room/:sessionID',
      element: <WaitingRoom />,
      loader: waitingRoomLoader,
    },
    {
      path: '/host/:sessionID',
      element: <Host />,
    },
    {
      path: '/level/:sessionID/:levelID',
      element: <Level />,
    },
    {
      path: '/leaderboard/:sessionID',
      element: <Leaderboard />,
    },
  ],
  // { basename: import.meta.env.DEV ? '/' : '/Festival-Frenzy-Online/' },
  // { basename: '/Festival-Frenzy-Online/' },
);

function App() {
  return (
    <UsernameContextProvider>
      <RouterProvider router={router} />
    </UsernameContextProvider>
  );
}

export default App;
