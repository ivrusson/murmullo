import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
