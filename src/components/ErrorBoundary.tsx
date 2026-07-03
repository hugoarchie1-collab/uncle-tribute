import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * App-wide error boundary. React 19 unmounts the ENTIRE root on any uncaught
 * render error → a blank, frozen page with no escape ("nothing works"). This
 * catches any throw below it and renders a dignified, recoverable fallback, so
 * a single bad component or a transient data edge case can never blank the
 * site. There was no error boundary anywhere before (QA finding 2026-06-17).
 *
 * Deliberately self-contained + dependency-light — it must still render when
 * something downstream is broken: plain Tailwind tokens, no motion, no data,
 * no hooks, no imports beyond React.
 */
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log without re-throwing; the fallback below is what the user sees.
    console.error("[ErrorBoundary] caught a render error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-6 bg-bg px-6 text-center text-ink"
      >
        <p className="font-sans text-[13px] font-bold tracking-[0.04em] text-ink/55">
          The Art of Stephen Meakin
        </p>
        <h1 className="max-w-[18ch] font-display text-[clamp(28px,6vw,44px)] font-semibold leading-[1.1] tracking-[-0.01em]">
          Something interrupted this page.
        </h1>
        <p className="max-w-[42ch] font-sans text-[15px] leading-relaxed text-ink/70">
          A quiet technical hiccup — not anything you did. Reloading usually puts
          it right.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="press inline-flex items-center justify-center rounded-full bg-ink px-7 py-3 font-sans text-[14px] font-bold tracking-[0.04em] text-bg transition-colors hover:bg-accent"
          >
            Reload the page
          </button>
          <a
            href="/"
            className="font-sans text-[14px] font-bold tracking-[0.04em] text-ink/55 transition-colors hover:text-ink"
          >
            Return home
          </a>
        </div>
      </div>
    );
  }
}
