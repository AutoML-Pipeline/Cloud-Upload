import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    step: 1,
    title: "Data Ingestion",
    description: "Upload data from various sources. (Current Step)",
    active: true,
  },
  {
    step: 2,
    title: "Preprocessing",
    description: "Clean and prepare your data.",
    active: false,
  },
  {
    step: 3,
    title: "Model Training",
    description: "Train ML models on your data.",
    active: false,
  },
  {
    step: 4,
    title: "Evaluation",
    description: "Evaluate model performance.",
    active: false,
  },
];

export default function SideMenu() {
  const stepRefs = useRef([]);
  const navigate = useNavigate();

  return (
    <aside className="w-[260px] h-[calc(100vh-62px)] min-h-0 max-h-[calc(100vh-62px)] overflow-y-auto bg-slate-800/95 text-slate-200 shadow-[2px_0_16px_rgba(30,41,59,0.12)] flex flex-col pt-10 pr-[1.2rem] pb-8 pl-9 fixed left-0 top-[62px] z-[2000] rounded-tr-[22px] rounded-br-[22px] box-border transition-shadow border-r-[1.5px] border-[#22304a]">
      <h2 className="text-2xl font-extrabold mb-9 text-sky-400 tracking-wider text-left font-sans">
        ML Pipeline Steps
      </h2>
      <div className="flex flex-col gap-[38px]">
        {steps.map((s, idx) => (
          <div
            key={s.step}
            ref={el => stepRefs.current[idx] = el}
            className={`py-5 pr-[1.2rem] pl-[0.7rem] rounded-2xl transition-all relative cursor-pointer mr-2 border-l-[6px] ${
              s.active ? 'bg-sky-300/20 border-l-sky-400 shadow-[0_2px_12px_rgba(56,189,248,0.12)]' : 'bg-transparent border-l-transparent'
            }`}
            onClick={() => {
              if (s.title === 'Data Ingestion') navigate('/upload-file');
              if (s.title === 'Preprocessing') navigate('/preprocessing');
              // Add navigation for other steps as needed
            }}
          >
            <div className={`text-[18px] font-extrabold ${s.active ? 'text-sky-400' : 'text-[#a3aed6]'} mb-1.5 font-sans tracking-[-0.01em]`}>
              Step {s.step}: {s.title}
            </div>
            <div className={`text-[15px] ${s.active ? 'text-slate-200' : 'text-[#a3aed6]'} font-medium font-sans`}>
              {s.description}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
