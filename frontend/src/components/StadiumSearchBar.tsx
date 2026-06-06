import { FormEvent } from "react";
import { Search } from "lucide-react";

interface StadiumSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onSelectTeam: () => void;
}

export function StadiumSearchBar({
  value,
  onChange,
  onSearch,
  onSelectTeam,
}: StadiumSearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form className="stadium-page-search" onSubmit={handleSubmit}>
      <label>
        <Search aria-hidden="true" />
        <input
          type="search"
          value={value}
          placeholder="구장명 또는 지역 검색"
          aria-label="구장명 또는 지역 검색"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <button className="stadium-page-search-button" type="submit">
        검색
      </button>
      <button className="stadium-page-team-button" type="button" onClick={onSelectTeam}>
        선택 팀
      </button>
    </form>
  );
}
