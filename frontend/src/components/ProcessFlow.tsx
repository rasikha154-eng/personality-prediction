import { useEffect, useRef, useState } from "react";

const steps = [
  {
    title: "Answer Questions",
    description: "Share your thoughts through writing prompts",
    color: { bg: "#EEEDFE", stroke: "#7F77DD", icon: "#534AB7" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    title: "Speak Aloud",
    description: "Record your voice for vocal pattern analysis",
    color: { bg: "#E6F1FB", stroke: "#378ADD", icon: "#185FA5" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    ),
  },
  {
    title: "Show Your Face",
    description: "Quick facial scan for micro-expression insights",
    color: { bg: "#E1F5EE", stroke: "#1D9E75", icon: "#0F6E56" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
        <line x1="9" y1="9" x2="9.01" y2="9"/>
        <line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
    ),
  },
  {
    title: "Get Your Results",
    description: "Receive detailed personality analysis",
    color: { bg: "#EAF3DE", stroke: "#639922", icon: "#3B6D11" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
  },
];

const STEP_DURATION = 2400;

export default function ProcessFlow() {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startProgress = () => {
    setProgress(0);
    const tick = 30;
    const steps_count = STEP_DURATION / tick;
    let step = 0;
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      step++;
      setProgress(Math.min((step / steps_count) * 100, 100));
      if (step >= steps_count) clearInterval(progressRef.current!);
    }, tick);
  };

  useEffect(() => {
    startProgress();
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % steps.length);
    }, STEP_DURATION);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  useEffect(() => {
    startProgress();
  }, [current]);

  return (
    <section style={{ padding: "5rem 1rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff", marginBottom: "1rem" }}>
            How It <span style={{ color: "#a78bfa" }}>Works</span>
          </h2>
          <p style={{ color: "#d1d5db", fontSize: "1.1rem", maxWidth: 520, margin: "0 auto" }}>
            Our advanced AI analyzes multiple dimensions of your personality through a simple 4-step process
          </p>
        </div>

        {/* Cards Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "nowrap" }}>
          {steps.map((step, i) => {
            const isActive = i === current;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: isActive ? `1.5px solid ${step.color.stroke}` : "0.5px solid rgba(255,255,255,0.1)",
                    borderRadius: 16,
                    padding: "20px 14px 18px",
                    width: 140,
                    textAlign: "center",
                    transition: "border-color 0.3s, transform 0.3s",
                    transform: isActive ? "scale(1.05)" : "scale(1)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {/* Icon Ring */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: isActive ? step.color.bg : "rgba(255,255,255,0.07)",
                      border: isActive ? `1px solid ${step.color.stroke}` : "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 10px",
                      transition: "background 0.4s, border 0.4s",
                    }}
                  >
                    <span style={{ color: isActive ? step.color.icon : "rgba(255,255,255,0.4)", display: "flex" }}>
                      {step.icon}
                    </span>
                  </div>

                  {/* Step Number */}
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isActive ? step.color.bg : "rgba(255,255,255,0.07)",
                      color: isActive ? step.color.icon : "rgba(255,255,255,0.4)",
                      border: isActive ? `1px solid ${step.color.stroke}` : "1px solid rgba(255,255,255,0.1)",
                      fontSize: 11,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 8px",
                      transition: "all 0.3s",
                    }}
                  >
                    {i + 1}
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? "#fff" : "rgba(255,255,255,0.5)", margin: "0 0 5px", lineHeight: 1.3, transition: "color 0.3s" }}>
                    {step.title}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5, margin: 0 }}>
                    {step.description}
                  </p>
                </div>

                {/* Arrow */}
                {i < steps.length - 1 && (
                  <div style={{ width: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, margin: "20px 24px 0", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: steps[current].color.stroke,
              borderRadius: 2,
              transition: "width 0.03s linear, background 0.4s",
            }}
          />
        </div>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                width: i === current ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === current ? step.color.stroke : "rgba(255,255,255,0.15)",
                transition: "width 0.3s, background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Quote */}
        <div style={{ textAlign: "center", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
          <p style={{ color: "#9ca3af", fontSize: "0.9rem", fontStyle: "italic", marginBottom: 6 }}>
            "The accuracy of this AI analysis amazed me. It revealed aspects of my personality I never fully understood."
          </p>
          <span style={{ color: "#a78bfa", fontSize: "0.85rem", fontWeight: 500 }}>— Sarah K., Beta Tester</span>
        </div>

      </div>
    </section>
  );
}