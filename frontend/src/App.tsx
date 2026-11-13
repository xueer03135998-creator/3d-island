import { RouterProvider } from 'react-router-dom';
import router from './router/index.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
