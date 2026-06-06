import { Utensils } from "lucide-react";
import type { Stadium } from "../data/stadiumData";
import { FoodCard } from "./FoodCard";

export function StadiumFoodTab({ stadium }: { stadium: Stadium }) {
  return (
    <section className="stadium-page-tab-panel" role="tabpanel">
      <h3 className="stadium-page-section-title">
        <Utensils aria-hidden="true" />
        {stadium.stadiumName} 먹거리
      </h3>
      <div className="stadium-page-food-list">
        {stadium.foods.map((food) => (
          <FoodCard food={food} key={food.foodId} />
        ))}
      </div>
    </section>
  );
}
