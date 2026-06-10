import { FormEvent } from "react";
import { Search } from "lucide-react";

interface StadiumSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onSelectTeam: () => void;
  isTeamListOpen: boolean;
}

export function StadiumSearchBar({
  value,
  onChange,
  onSearch,
  onSelectTeam,
  isTeamListOpen,
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
          placeholder="구단명, 구장명 또는 지역 이름"
          aria-label="구단명, 구장명 또는 지역 이름"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <button className="stadium-page-search-button" type="submit">
        검색
      </button>
      <button
        aria-expanded={isTeamListOpen}
        className="stadium-page-team-button"
        type="button"
        onClick={onSelectTeam}
      >
        선택 팀
      </button>
    </form>
  );
}
