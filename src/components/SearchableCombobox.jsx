import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeSearchValue } from "../utils/search";
import useDebouncedValue from "../utils/useDebouncedValue";

export default function SearchableCombobox({
  id,
  label,
  required = false,
  placeholder,
  options,
  value,
  inputValue,
  onInputChange,
  onChange,
  disabled = false,
  loading = false,
  error,
  noResultsText = "Không tìm thấy",
  onBlur
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listId = `${id}-listbox`;
  const debouncedInput = useDebouncedValue(inputValue, 200);

  const filteredOptions = useMemo(() => {
    const query = normalizeSearchValue(debouncedInput);
    if (!query) return options;
    return options.filter(option => normalizeSearchValue(option.label).includes(query));
  }, [debouncedInput, options]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onBlur]);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (option) => {
    onChange(option.value);
    onInputChange(option.label, { fromSelection: true });
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        onBlur?.();
      }
    }, 0);
  };

  const handleKeyDown = (event) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }
    if (!isOpen) return;
    if (filteredOptions.length === 0) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) handleSelect(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const disabledState = disabled || loading;

  return (
    <div className="relative space-y-1" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-300">
          {label}{required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value, { fromSelection: false })}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Đang tải..." : placeholder}
          disabled={disabledState}
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          className={`w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-700 ${error ? "border-red-400 dark:border-red-500" : "border-slate-200 dark:border-slate-600"} ${disabledState ? "opacity-60 cursor-not-allowed" : ""}`}
        />
        {selectedOption && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 dark:text-emerald-400">
            Đã chọn
          </span>
        )}
      </div>
      {isOpen && !disabledState && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{noResultsText}</div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${index === activeIndex ? "bg-slate-100 dark:bg-slate-700" : ""}`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-500">{error}</div>
      )}
    </div>
  );
}
