import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { ExerciseImage as Image } from "../catalog/catalog.ts";
import { TEXTS } from "../app/texts.ts";
import styles from "./ExerciseImage.module.css";

// ExerciseImage (UX-06): as duas posições do exercício, ou o placeholder padronizado quando não
// há foto ou ela não carrega, como sem conexão e fora do cache (RF-034, CA-034, RF-118). As
// imagens são arquivos estáticos do próprio app (sem dado pessoal — ADR-028 L5).
export function ExerciseImage({
  images,
  size = "large",
}: {
  images: readonly Image[];
  size?: "large" | "thumb";
}) {
  // Pelo caminho, não por um booleano: a execução troca de exercício sem remontar a tela.
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const shown = images.slice(0, size === "thumb" ? 1 : 2);
  const className = size === "thumb" ? styles.thumb : styles.large;

  if (shown.length === 0 || shown.some((image) => image.path === failedPath)) {
    return (
      <div
        className={[className, styles.placeholder].filter(Boolean).join(" ")}
        role="img"
        aria-label={TEXTS.catalog.noImage}
      >
        <ImageOff size={size === "thumb" ? 20 : 40} aria-hidden="true" />
        {size === "large" ? <span>{TEXTS.catalog.noImage}</span> : null}
      </div>
    );
  }

  const photos = shown.map((image) => (
    <img
      key={image.path}
      className={className}
      src={image.path}
      alt={image.alt_text}
      loading="lazy"
      decoding="async"
      onError={() => {
        setFailedPath(image.path);
      }}
      {...(image.width ? { width: image.width } : {})}
      {...(image.height ? { height: image.height } : {})}
    />
  ));
  return size === "thumb" ? photos : <div className={styles.photos}>{photos}</div>;
}
