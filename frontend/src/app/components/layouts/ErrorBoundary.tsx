import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { THEME } from "../../constants/projectConstants";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional label shown in the fallback, e.g. the section that failed. */
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Menahan error render dari satu bagian halaman supaya seluruh aplikasi tidak
 * menjadi white screen. Fallback menampilkan pesan + tombol coba lagi.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error:", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 p-8 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="font-bold" style={{ color: THEME.BSI_DARK_GRAY }}>
          {this.props.label ? `${this.props.label} gagal ditampilkan.` : "Bagian ini gagal ditampilkan."}
        </p>
        <p className="text-xs font-mono text-rose-600 break-words max-w-xl mx-auto">
          {error.message}
        </p>
        <Button variant="outline" onClick={this.reset} className="gap-2 rounded-xl">
          <RefreshCw className="h-4 w-4" /> Coba lagi
        </Button>
      </div>
    );
  }
}
