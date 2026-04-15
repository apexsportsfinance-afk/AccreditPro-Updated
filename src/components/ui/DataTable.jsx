import React, { useState, useMemo, useCallback, useRef, memo } from "react";
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100, 200, 500];

const TableRow = memo(function TableRow({ row, columns, selectable, selectedRows, onSelectRow, onRowClick }) {
  const isSelected = selectedRows.includes(row.id);

  const handleCheckboxChange = useCallback((e) => {
    e.stopPropagation();
    onSelectRow(row.id);
  }, [row.id, onSelectRow]);

  const handleRowClick = useCallback(() => {
    onRowClick?.(row);
  }, [row, onRowClick]);

  return (
    <tr
      className={cn(
        "group transition-all duration-200",
        onRowClick && "cursor-pointer",
        isSelected ? "bg-primary-500/10" : "hover:bg-white/[0.02]"
      )}
      onClick={handleRowClick}
    >
      {selectable && (
        <td className="w-12 px-6 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              className="w-4 h-4 rounded-md border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/40 cursor-pointer transition-all"
            />
          </div>
        </td>
      )}
      {columns.map((column) => {
        let content;
        try {
          content = column.render ? column.render(row) : row[column.key];
        } catch (err) {
          console.error(`Render error in column ${column.key}:`, err);
          content = <span className="text-red-400/50 italic text-[10px]">Data Error</span>;
        }
        return (
          <td key={column.key} className="px-6 py-5 text-sm text-slate-300 font-medium whitespace-nowrap border-b border-white/[0.02]">
            {content}
          </td>
        );
      })}
    </tr>
  );
});

export default function DataTable({
  data = [],
  columns = [],
  searchable = true,
  searchFields = [],
  selectable = false,
  selectedRows = [],
  onSelectRows,
  onRowClick,
  emptyMessage = "No records found in database",
  className,
  pageSize: initialPageSize = 50
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize);
  const debounceRef = useRef(null);

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val);
      setCurrentPage(1);
    }, 300);
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
    setCurrentPage(1);
  }, []);

  const searchLower = useMemo(() => debouncedQuery.toLowerCase(), [debouncedQuery]);

  const filteredData = useMemo(() => {
    let result = Array.isArray(data) ? data : [];

    if (searchLower && searchFields.length > 0) {
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = field.split(".").reduce((obj, key) => obj?.[key], item);
          return String(value || "").toLowerCase().includes(searchLower);
        })
      );
    }

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortConfig.direction === "asc" ? -1 : 1;
        if (bVal == null) return sortConfig.direction === "asc" ? 1 : -1;
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchLower, searchFields, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, safePage, rowsPerPage]);

  const selectedRowsSet = useMemo(() => new Set(selectedRows), [selectedRows]);
  const selectedRowsSetForChild = useMemo(() => [...selectedRowsSet], [selectedRowsSet]);

  const handleSelectAll = useCallback(() => {
    if (!onSelectRows) return;
    const pageIds = paginatedData.map((item) => item.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedRowsSet.has(id));
    if (allPageSelected) {
      onSelectRows(selectedRows.filter((id) => !pageIds.includes(id)));
    } else {
      const newSelected = new Set([...selectedRows, ...pageIds]);
      onSelectRows([...newSelected]);
    }
  }, [paginatedData, selectedRows, selectedRowsSet, onSelectRows]);

  const handleSelectAllFiltered = useCallback(() => {
    if (!onSelectRows) return;
    onSelectRows(filteredData.map((item) => item.id));
  }, [filteredData, onSelectRows]);

  const handleSelectRow = useCallback((id) => {
    if (!onSelectRows) return;
    if (selectedRowsSet.has(id)) {
      onSelectRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      onSelectRows([...selectedRows, id]);
    }
  }, [selectedRows, selectedRowsSet, onSelectRows]);

  const allPageSelected = paginatedData.length > 0 && paginatedData.every((r) => selectedRowsSet.has(r.id));

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const getPageNumbers = useCallback(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [safePage, totalPages]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {searchable && (
          <div className="relative w-full sm:max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary-400 transition-colors" />
            <input
              type="text"
              placeholder="Instant search in records..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-12 pr-4 h-12 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:bg-white/10 focus:border-primary-500/50 transition-all"
            />
          </div>
        )}
        <div className="flex items-center gap-4">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Density</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-white focus:outline-none hover:bg-white/10 transition-all cursor-pointer"
          >
            {ROWS_PER_PAGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="bg-slate-900">{opt} / page</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/[0.03]">
                {selectable && (
                  <th className="w-12 px-6 py-5 border-b border-white/5">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded-md border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/40 cursor-pointer transition-all"
                      />
                    </div>
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5",
                      column.sortable && "cursor-pointer select-none hover:text-white transition-colors"
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable && sortConfig.key === column.key && (
                        <div className="flex flex-col text-primary-500">
                          {sortConfig.direction === "asc" ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                          }
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-6 py-24 text-center"
                  >
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Search className="w-12 h-12" />
                      <p className="text-xl font-light italic">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <TableRow
                    key={row.id}
                    row={row}
                    columns={columns}
                    selectable={selectable}
                    selectedRows={selectedRowsSetForChild}
                    onSelectRow={handleSelectRow}
                    onRowClick={onRowClick}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Pagination Control</span>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-bold uppercase italic">
              <span>{filteredData.length === 0 ? "Entry null" : `Showing ${((safePage - 1) * rowsPerPage) + 1} - ${Math.min(safePage * rowsPerPage, filteredData.length)} of ${filteredData.length}`}</span>
              {data.length !== filteredData.length && <span className="text-primary-500/50">• Query match found</span>}
            </div>
          </div>
          {selectable && selectedRows.length > 0 && (
            <div className="px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full">
              <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest">{selectedRows.length} Marked</span>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 bg-white/5 border border-white/5 p-1 rounded-2xl">
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={cn(
                    "w-9 h-9 rounded-xl text-xs font-black transition-all",
                    page === safePage
                      ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                      : "text-slate-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
