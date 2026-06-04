import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi';

/**
 * Reusable search bar with clear button.
 * @param {string} value - controlled value
 * @param {Function} onChange - setter
 * @param {string} placeholder
 */
export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search-bar-wrap">
      <HiOutlineSearch />
      <input
        type="text"
        id="search-input"
        name="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          <HiOutlineX />
        </button>
      )}
    </div>
  );
}
