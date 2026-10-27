import { ImageOff } from "lucide-react";
import type { ExerciseImage as Image } from "../catalog/catalog.ts";
import { TEXTS } from "../app/texts.ts";
import styles from "./ExerciseImage.module.css";

// ExerciseImage (UX-06): primeira imagem comprovada ou o placeholder padronizado (RF-034,
// CA-034). As imagens são arquivos estáticos do próprio app (sem dado pessoal — ADR-028 L5).
export function ExerciseImage({
  images,
  size = "large",
}: {
  images: readonly Image[];
  size?: "large" | "thumb";
}) {
  const image = images[0];
  const className = size === "thumb" ? styles.thumb : styles.large;
  if (!image) {
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
  return (
    <img
      className={className}
      src={image.path}
      alt={image.alt_text}
      loading="lazy"
      decoding="async"
      {...(image.width ? { width: image.width } : {})}
      {...(image.height ? { height: image.height } : {})}
    />
  );
}
