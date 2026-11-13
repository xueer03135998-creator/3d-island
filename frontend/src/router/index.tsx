import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import Home from '../views/Home.tsx';
import NotFound from '../views/NotFound.tsx';

const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  { path: '*', element: <NotFound /> },
];

const basename = import.meta.env.VITE_BASE_PATH || '/';

const router = createBrowserRouter(routes, { basename });

if (typeof window !== 'undefined' && basename !== '/') {
  const appRoot = basename.replace(/\/+$/, '');
  const ensureTrailingSlash = (): void => {
    const { pathname, search, hash } = window.location;
    if (pathname === appRoot) {
      window.history.replaceState(window.history.state, '', `${appRoot}/${search}${hash}`);
    }
  };
  router.subscribe(ensureTrailingSlash);
}

export default router;
