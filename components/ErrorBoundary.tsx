"use client";

import { Component, ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Cicha degradacja — np. brak wsparcia WebGL.
    console.warn("3D scene failed to render:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-brand-50">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-bold text-white shadow-lg">
                L
              </div>
              <p className="mt-4 font-semibold text-ink">Lechrol</p>
              <p className="text-sm text-ink-muted">
                Osłony okienne na wymiar
              </p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
