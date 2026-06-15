import { useState } from "react";
import type { Food } from "../data/stadiumData";

const FALLBACK_FOOD_IMAGE = "/img/background.png";

export function FoodCard({ food }: { food: Food }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed || !food.imageUrl ? FALLBACK_FOOD_IMAGE : food.imageUrl;
  const foodName = food.name.replace(/[.。]+$/g, "").trim();
  const descriptionLines = food.description
    .split(/[.。,，]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = descriptionLines[0] || "";
  const secondLine = descriptionLines.slice(1).join(" ");

  return (
    <article className="stadium-page-food-card">
      <div className="stadium-page-food-image">
        <img src={imageUrl} alt={foodName} onError={() => setImageFailed(true)} />
      </div>
      <div>
        <h3>{foodName}</h3>
        <p>
          <span>{firstLine}</span>
          {secondLine ? <span>{secondLine}</span> : null}
        </p>
      </div>
    </article>
  );
}
