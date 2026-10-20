export interface FilterOption {
  value: string;
  text: string;
  count: number;
}

// The filter row above the event, news and student-work lists. A toggle-button
// group, not tabs: there are no tabpanels and no arrow-key semantics, so
// aria-pressed marks the active filter.
export default function FilterButtons({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="sw-filter" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          // The whitespace between label and count is dropped from the
          // computed name ("Fall 20263"), so name the button explicitly,
          // with exactly the visible words so the name contains the label.
          aria-label={`${option.text} ${option.count}`}
          aria-pressed={value === option.value}
          className={`sw-filter__btn${value === option.value ? ' is-active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.text} <span className="sw-filter__count">{option.count}</span>
        </button>
      ))}
    </div>
  );
}
