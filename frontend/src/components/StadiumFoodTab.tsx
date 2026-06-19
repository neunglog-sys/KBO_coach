import { Utensils } from "lucide-react";
import type { Stadium } from "../data/stadiumData";
import { FoodCard } from "./FoodCard";

export function StadiumFoodTab({ stadium }: { stadium: Stadium }) {
  return (
    <section className="stadium-page-tab-panel" role="tabpanel">
      <div className="stadium-page-food-heading">
        <h3 className="stadium-page-section-title">
          <Utensils aria-hidden="true" />
          {stadium.stadiumName} 먹거리
        </h3>
      </div>
      <p className="stadium-page-food-ai-notice">아래 이미지는 생성된 AI 이미지입니다.</p>
      <div className="stadium-page-food-list">
        {stadium.foods.length ? stadium.foods.map((food) => (
          <FoodCard food={food} key={food.foodId} />
        )) : <div className="stadium-page-empty">준비 중입니다</div>}
      </div>
    </section>
  );
}
