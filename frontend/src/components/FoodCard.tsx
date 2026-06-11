import { useState } from "react";
import type { Food } from "../data/stadiumData";

const FALLBACK_FOOD_IMAGE = "/img/background.png";

export function FoodCard({ food }: { food: Food }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed || !food.imageUrl ? FALLBACK_FOOD_IMAGE : food.imageUrl;

  return (
    <article className="stadium-page-food-card">
      <div className="stadium-page-food-image">
        <img src={imageUrl} alt={food.name} onError={() => setImageFailed(true)} />
      </div>
      <div>
        <h3>{food.name}</h3>
        <p>{food.description}</p>
      </div>
    </article>
  );
}
