import { useEffect, useRef, useState } from "react";
import { Brain, Shield, Award } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Advanced AI Models",
    description: "State-of-the-art machine learning algorithms analyze multiple personality dimensions",
    color: { bg: "#EEEDFE", stroke: "#7F77DD", icon: "#534AB7" },
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your data is encrypted and never shared. Complete privacy and security guaranteed",
    color: { bg: "#E1F5EE", stroke: "#1D9E75", icon: "#0F6E56" },
  },
  {
    icon: Award,
    title: "Scientific Accuracy",
    description: "Based on validated psychological frameworks including Big Five and MBTI",
    color: { bg: "#FAEEDA", stroke: "#BA7517", icon: "#854F0B" },
  },
];

const stats = [
  { number: "95%", label: "Accuracy Rate" },
  { number: "10K+", label: "Users Analyzed" },
  { number: "3", label: "Analysis Methods" },
  { number: "24/7", label: "Availability" },
];

const validations = [
  "Tested against established psychological assessments",
  "95% correlation with professional evaluations",
  "Continuous learning and model improvement",
  "Peer-reviewed research methodology",
];

const scienceItems = [
  {
    label: "Text Analysis",
    desc: "Natural language processing examines writing patterns, word choice, and emotional expression.",
    color: "#7F77DD",
  },
  {
    label: "Voice Analysis",
    desc: "Advanced audio processing analyzes speech patterns, tone, pace, and emotional inflections.",
    color: "#1D9E75",
  },
  {
    label: "Facial Analysis",
    desc: "Computer vision reads micro-expressions and facial features correlating with personality.",
    color: "#BA7517",
  },
];

function useCountUp(target: number, duration = 1200, suffix = "") {
  const [value, setValue] = useState("0" + suffix);
  const hasRun = useRef(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasRun.current) {
          hasRun.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setValue(Math.round(ease * target) + suffix);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration, suffix]);

  return { value, ref };
}

function StatCard({ number, label }: { number: string; label: string }) {
  const isPercent = number.endsWith("%");
  const isK = number.endsWith("K+");
  const raw = parseInt(number.replace(/\D/g, ""));
  const suffix = isPercent ? "%" : isK ? "K+" : number.replace(/\d/g, "");
  const { value, ref } = useCountUp(raw, 1400, suffix);

  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "2.2rem",
          fontWeight: 700,
          color: "#a78bfa",
          marginBottom: 4,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{label}</div>
    </div>
  );
}

export default function AboutSection() {
  const [visibleCards, setVisibleCards] = useState<boolean[]>([false, false, false]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = cardRefs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisibleCards((prev) => {
                const next = [...prev];
                next[i] = true;
                return next;
              });
            }, i * 120);
          }
        },
        { threshold: 0.15 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  return (
    <section id="about" style={{ padding: "5rem 1rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff", marginBottom: "1rem" }}>
            Why Choose{" "}
            <span style={{ color: "#a78bfa" }}>AI Personality?</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1.05rem", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            Our cutting-edge AI combines multiple analysis methods to provide the most comprehensive personality assessment available today.
          </p>
        </div>

        {/* Feature Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: "2.5rem" }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                ref={(el) => { cardRefs.current[i] = el; }}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `0.5px solid rgba(255,255,255,0.09)`,
                  borderRadius: 16,
                  padding: "28px 20px",
                  textAlign: "center",
                  opacity: visibleCards[i] ? 1 : 0,
                  transform: visibleCards[i] ? "translateY(0)" : "translateY(24px)",
                  transition: "opacity 0.5s ease, transform 0.5s ease",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = `0.5px solid ${f.color.stroke}`;
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border = "0.5px solid rgba(255,255,255,0.09)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: f.color.bg,
                    border: `1px solid ${f.color.stroke}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                  }}
                >
                  <Icon size={22} color={f.color.icon} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>{f.description}</p>
              </div>
            );
          })}
        </div>

        {/* Stats Bar */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "0.5px solid rgba(255,255,255,0.09)",
            borderRadius: 16,
            padding: "28px 32px",
            marginBottom: "2.5rem",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            backdropFilter: "blur(8px)",
          }}
        >
          {stats.map((s, i) => <StatCard key={i} number={s.number} label={s.label} />)}
        </div>

        {/* Science + Validation */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Science */}
          <div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginBottom: "1.2rem" }}>
              The Science Behind It
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: "1.2rem" }}>
              Our AI uses a multi-modal approach, analyzing three distinct data sources to create a comprehensive personality profile.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {scienceItems.map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `0.5px solid rgba(255,255,255,0.07)`,
                    borderLeft: `2.5px solid ${item.color}`,
                    borderRadius: "0 10px 10px 0",
                    padding: "12px 14px",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.label}: </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Validation */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.09)",
              borderRadius: 16,
              padding: "24px 20px",
              backdropFilter: "blur(8px)",
            }}
          >
            <h4 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: "1.2rem" }}>
              Validation & Accuracy
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {validations.map((v, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    opacity: 0,
                    animation: `fadeUp 0.4s ease ${0.1 + i * 0.1}s forwards`,
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#E1F5EE",
                      border: "1px solid #1D9E75",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <polyline points="1.5,4.5 3.5,6.5 7.5,2.5" stroke="#0F6E56" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}