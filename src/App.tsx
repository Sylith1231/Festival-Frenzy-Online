import { createBrowserRouter, createHashRouter, redirect, RouterProvider } from 'react-router-dom';
import { TeamContextProvider } from './context/TeamContext';
import Landing from './pages/Landing';
import Host from './pages/Host';
import Level from './pages/Level';
import Leaderboard from './pages/Leaderboard';
import Test from './pages/Test';
import CreateSession from './pages/CreateSession';
import NewHost from './pages/Host';
import Test2 from './pages/Test2';
import WaitingRoom from './pages/WaitingRoom';

function chooseRouter() {
  if (import.meta.env.DEV) {
    return createBrowserRouter;
  } else {
    return createHashRouter;
  }
}

function authLoader() {
  const username = sessionStorage.getItem('teamNumber');
  if (!username) {
    return redirect('/');
  }
  return null;
}

const router = chooseRouter()(
  [
    {
      path: '/',
      element: <Landing />,
    },
    {
      path: '/test',
      element: <Test />,
    },
    {
      path: '/waiting-room/:sessionID',
      element: <WaitingRoom />,
    },
    { path: '/create-session', element: <CreateSession /> },
    {
      path: '/host/:sessionID',
      element: <Host />,
    },
    {
      path: '/newHost/:sessionID',
      element: <NewHost />,
    },
    {
      path: '/level/:sessionID/:levelID',
      element: <Level />,
      loader: authLoader,
    },
    {
      path: '/leaderboard/:sessionID',
      element: <Leaderboard />,
      loader: authLoader,
    },
    {
      path: '/test2',
      element: <Test2 />,
    },
    {
      path: '/*',
      loader: () => redirect('/'),
    },
  ],
  // { basename: import.meta.env.DEV ? '/' : '/Festival-Frenzy-Online/' },
);

console.log(import.meta.env.DEV);

function App() {
  // let preventComitUntilBaseChanged;
  return (
    <TeamContextProvider>
      <RouterProvider router={router} />
    </TeamContextProvider>
  );
}

export default App;
