import { Search } from "lucide-react";

const SearchBar = ({ value, onChange, placeholder = "Search...", className = "" }) => {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
    </div>
  );
};

export default SearchBar;
