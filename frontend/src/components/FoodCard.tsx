import { useState } from "react";
import { Utensils } from "lucide-react";
import type { Food } from "../data/stadiumData";

export function FoodCard({ food }: { food: Food }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="stadium-page-food-card">
      <div className="stadium-page-food-image">
        {imageFailed ? (
          <Utensils aria-label="음식 이미지 준비 중" />
        ) : (
          <img src={food.imageUrl} alt={food.name} onError={() => setImageFailed(true)} />
        )}
      </div>
      <div>
        <h3>{food.name}</h3>
        <p>{food.description}</p>
      </div>
    </article>
  );
}
