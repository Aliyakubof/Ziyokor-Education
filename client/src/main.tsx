import { StrictMode, Component } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fee2e2', color: '#991b1b', fontFamily: 'sans-serif', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Xatolik yuz berdi (Crash)</h1>
          <p style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{this.state.error?.message}</p>
          <pre style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', fontSize: '0.8rem', opacity: 0.8 }}>{this.state.error?.stack}</pre>
          <button onClick={() => { window.localStorage.clear(); window.location.reload(); }} style={{ marginTop: '2rem', padding: '10px', background: 'white', color: 'black' }}>Tozalash va qayta yuklash</button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
