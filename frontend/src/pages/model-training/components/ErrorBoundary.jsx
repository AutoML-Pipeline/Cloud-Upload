import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You could send this to logging infra here
    console.error("ModelTraining ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2>Something went wrong on the Model Training page.</h2>
          <p className="text-red-700">{String(this.state.error)}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
