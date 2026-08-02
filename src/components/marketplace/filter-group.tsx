interface Option {
  value: string;
  label: string;
}

interface FilterGroupProps {
  label: string;
  name: string;
  options: Option[];
  selected: string[];
  disabled?: boolean;
}

export function FilterGroup({
  label,
  name,
  options,
  selected,
  disabled = false,
}: FilterGroupProps) {
  return (
    <fieldset className="mb-5" disabled={disabled}>
      <legend className="mb-2.5">
        <h3>{label}</h3>
      </legend>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={
              disabled
                ? "flex items-center gap-2.5 text-ink-3 cursor-not-allowed"
                : "flex items-center gap-2.5 text-ink-2 cursor-pointer hover:text-ink"
            }
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
              className="w-[15px] h-[15px] rounded-[4px] border-[1.5px] border-line accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
