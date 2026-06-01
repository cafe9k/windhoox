import "./styles.css";

export function App() {
  const platform = window.windhoox?.platform ?? "unknown";

  return (
    <main className="app-shell">
      <section className="intro">
        <p className="eyebrow">Windhoox Desktop</p>
        <h1>Hello, Windhoox</h1>
        <p className="subtitle">Electron + Vite + React + TypeScript</p>
        <p className="meta">Running on {platform}</p>
      </section>
    </main>
  );
}

