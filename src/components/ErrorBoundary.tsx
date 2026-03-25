import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      let errorMessage = 'Something went wrong.';
      try {
        const errInfo = JSON.parse(error?.message || '{}');
        if (errInfo.error) {
          errorMessage = `Firestore Error: ${errInfo.error} (Path: ${errInfo.path})`;
        }
      } catch (e) {
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-lg w-full text-center space-y-4">
            <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Oops! Ralat Berlaku</h1>
            <p className="text-gray-600 font-medium">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-matcha text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all"
            >
              Muat Semula Laman
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
