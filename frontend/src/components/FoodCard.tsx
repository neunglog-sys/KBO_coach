import { useState } from "react";
import type { Food } from "../data/stadiumData";

const FALLBACK_FOOD_IMAGE = "/img/background.png";

function descriptionLines(description: string): [string, string] {
  const explicit = description
    .split(/[.。]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (explicit.length >= 2) return [explicit[0], explicit.slice(1).join(" ")];

  const cleaned = description.replace(/[.。]/g, "").trim();
  const commaParts = cleaned.split(/[,，]/).map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) return [commaParts[0], commaParts.slice(1).join(" ")];

  const words = cleaned.split(/\s+/);
  if (words.length < 2) return [cleaned, ""];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

export function FoodCard({ food }: { food: Food }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed || !food.imageUrl ? FALLBACK_FOOD_IMAGE : food.imageUrl;
  const [firstLine, secondLine] = descriptionLines(food.description);

  return (
    <article className="stadium-page-food-card">
      <div className="stadium-page-food-image">
        <img src={imageUrl} alt={food.name} onError={() => setImageFailed(true)} />
      </div>
      <div>
        <h3>{food.name}</h3>
        <p>
          <span>{firstLine}</span>
          {secondLine ? <span>{secondLine}</span> : null}
        </p>
      </div>
    </article>
  );
}
