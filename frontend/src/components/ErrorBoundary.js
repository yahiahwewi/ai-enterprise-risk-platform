import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-error mb-4 block">error</span>
          <h2 className="text-lg font-bold font-headline text-on-surface dark:text-slate-200 mb-2">Something went wrong</h2>
          <p className="text-sm text-on-surface-variant mb-6">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button
            className="executive-gradient text-white text-sm font-bold px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
