import { Providers } from "./app/providers";
import { ErrorBoundary } from "./components/organisms/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <Providers />
    </ErrorBoundary>
  );
}

export default App;
