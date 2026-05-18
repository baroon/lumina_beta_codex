import { Providers } from "./app/providers";
import { ErrorBoundary } from "./components/feedback/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <Providers />
    </ErrorBoundary>
  );
}

export default App;
