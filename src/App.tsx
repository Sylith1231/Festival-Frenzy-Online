import { createHashRouter, RouterProvider } from 'react-router-dom';
import { UsernameContextProvider } from './context/UsernameContext';
import Landing from './pages/Landing';
import WaitingRoom, { loader as waitingRoomLoader } from './pages/WaitingRoom';
import Host from './pages/Host';
import Level from './pages/Level';
import Leaderboard from './pages/Leaderboard';
import Test from './pages/Test';

// function chooseRouter() {
//   if (import.meta.env.DEV) {
//     return createBrowserRouter;
//   } else {
//     return createHashRouter;
//   }
// }

// function authLoader() {
//   const username = sessionStorage.getItem('username');
//   if (!username) {
//     return redirect('/');
//   }
//   return null;
// }

// const router = chooseRouter()(
const router = createHashRouter(
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
      loader: waitingRoomLoader,
    },
    {
      path: '/host/:sessionID',
      element: <Host />,
    },
    {
      path: '/level/:sessionID/:levelID',
      element: <Level />,
      // loader: authLoader,
    },
    {
      path: '/leaderboard/:sessionID',
      element: <Leaderboard />,
      // loader: authLoader,
    },
    // {
    //   path: '/*',
    //   loader: () => redirect('/'),
    // },
  ],
  { basename: import.meta.env.DEV ? '/' : '/Festival-Frenzy-Online/' },
);

console.log(import.meta.env.DEV);

function App() {
  return (
    <UsernameContextProvider>
      <RouterProvider router={router} />
    </UsernameContextProvider>
  );
}

export default App;
