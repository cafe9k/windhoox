import { AppProviders } from "./app/AppProviders";
import { WorkbenchPage } from "./features/workbench/WorkbenchPage";
import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/layout.css";

export function App() {
  return (
    <AppProviders>
      <WorkbenchPage />
    </AppProviders>
  );
}
