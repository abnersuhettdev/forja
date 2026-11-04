import styles from "./WeightPlate.module.css";

/** Anilha de ferro da tela de login (UX-02 §2.3): decorativa, em SVG, sem imagem externa. */
export function WeightPlate({ className }: { className?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden="true"
      className={[styles.plate, className].filter(Boolean).join(" ")}
    >
      <defs>
        <linearGradient id="anilha-aro" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#59636e" />
          <stop offset="0.5" stopColor="#2a3038" />
          <stop offset="1" stopColor="#14181d" />
        </linearGradient>
        <linearGradient id="anilha-face" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14181d" />
          <stop offset="1" stopColor="#2a3038" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="196" fill="url(#anilha-aro)" />
      <circle cx="200" cy="200" r="178" fill="#1a1f25" />
      <circle cx="200" cy="200" r="171" fill="none" stroke="#a3e635" strokeWidth="5" />
      <circle cx="200" cy="200" r="162" fill="url(#anilha-face)" stroke="#0e1114" strokeWidth="2" />
      <circle cx="200" cy="200" r="104" fill="none" stroke="#3a4450" strokeWidth="1.5" />
      {GRIPS.map((d) => (
        <g key={d}>
          <path d={d} fill="none" stroke="#59636e" strokeWidth="35" strokeLinecap="round" />
          <path d={d} fill="none" className={styles.hole} strokeWidth="31" strokeLinecap="round" />
        </g>
      ))}
      <text
        x="200"
        y="293"
        textAnchor="middle"
        transform="rotate(45 200 200)"
        className={styles.weight}
      >
        20 KG
      </text>
      <circle cx="200" cy="200" r="64" fill="url(#anilha-aro)" />
      <circle cx="200" cy="200" r="50" fill="#1a1f25" stroke="#0e1114" strokeWidth="2" />
      <circle cx="200" cy="200" r="27" className={styles.bore} stroke="#59636e" strokeWidth="4" />
    </svg>
  );
}

/** Os três pegadores vazados, a 120° um do outro. */
const GRIPS = [
  "M154.1 319.5 A128 128 0 0 1 80.5 245.8",
  "M326.4 180 A128 128 0 0 1 299.5 280.6",
  "M119.5 100.5 A128 128 0 0 1 220 73.6",
];
