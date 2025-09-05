import React from "react";
import { useNavigate } from "react-router-dom";
import ShadcnNavbar from "../components/ShadcnNavbar";

const steps = [
  {
    label: "Data Ingestion",
    route: "/data-ingestion",
    icon: "📂",
    color: "#60a5fa"
  },
  {
    label: "Preprocessing",
    route: "/preprocessing",
    icon: "🧹",
    color: "#fbbf24"
  },
  // Add more steps as needed, e.g.:
  // { label: "Training", route: "/training", icon: "🤖", color: "#34d399" }
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="page-shell">
      <ShadcnNavbar />
      <div className="min-h-screen w-full flex flex-col items-center justify-center pt-24 pb-16">
        <div className="text-[2rem] font-bold tracking-tight text-text mb-10 text-center">
          Welcome to Your ML Pipeline!
        </div>
        <div className="dashboard-stepper-fun">
          {steps.map((step, idx) => (
            <React.Fragment key={step.label}>
              <div
                className="dashboard-step-box-fun"
                style={{ borderColor: step.color, boxShadow: `0 4px 24px ${step.color}55` }}
                onClick={() => navigate(step.route)}
                tabIndex={0}
                role="button"
              >
                <span className="dashboard-step-icon" style={{ fontSize: 40 }}>{step.icon}</span>
                <span className="dashboard-step-label-fun">{step.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className="dashboard-step-arrow-fun">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
