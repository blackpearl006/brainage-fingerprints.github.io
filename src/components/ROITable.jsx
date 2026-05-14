import { useMemo, useState } from "react";
import { networkColors } from "../lib/theme";

export default function ROITable({ regions, counts, sig, showAll = false }) {
  const [sortKey, setSortKey] = useState("count");
  const [sortDir, setSortDir] = useState(-1); // -1 = descending

  const rows = useMemo(() => {
    if (!regions || !counts) return [];
    const result = [];
    for (let i = 0; i < 246; i++) {
      const roiId = i + 1;
      const r = regions.get(roiId);
      if (!r) continue;
      const isSig = sig?.[i] === 1;
      if (!showAll && !isSig) continue;
      result.push({ id: roiId, ...r, count: counts[i] ?? 0, isSig });
    }
    result.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") return sortDir * av.localeCompare(bv);
      return sortDir * (av - bv);
    });
    return result;
  }, [regions, counts, sig, showAll, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(-1); }
  }

  const thCls = "px-3 py-2.5 text-left font-mono text-[11px] font-semibold text-ink2 cursor-pointer select-none hover:text-ink whitespace-nowrap";
  const tdCls = "px-3 py-2 font-mono text-xs";

  return (
    <div className="overflow-x-auto rounded-lg border border-rule/20">
      <table className="w-full bg-paper2 text-sm">
        <thead className="border-b border-rule/20 bg-paper">
          <tr>
            <th className={thCls} onClick={() => toggleSort("id")}>#</th>
            <th className={thCls} onClick={() => toggleSort("label")}>Label</th>
            <th className={thCls} onClick={() => toggleSort("subregion")}>Subregion</th>
            <th className={thCls} onClick={() => toggleSort("network7")}>Network</th>
            <th className={thCls} onClick={() => toggleSort("hemi")}>Hemi</th>
            <th className={thCls + " text-right pr-6"} onClick={() => toggleSort("count")}>Count ↕</th>
            <th className={thCls + " text-center"}>Sig.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id}
              className={`border-b border-rule/10 hover:bg-paper transition-colors ${idx % 2 === 0 ? "" : "bg-paper/40"}`}
            >
              <td className={tdCls + " text-ink2"}>{row.id}</td>
              <td className={tdCls + " font-semibold text-ink"}>{row.label}</td>
              <td className={tdCls + " text-ink2 max-w-[180px] truncate"}>{row.subregion}</td>
              <td className={tdCls}>
                <span
                  className="px-2 py-0.5 rounded-full text-white text-[10px] font-sans whitespace-nowrap"
                  style={{ background: networkColors[row.network7] ?? "#999" }}
                >
                  {row.network7}
                </span>
              </td>
              <td className={tdCls + " text-ink2 text-center"}>{row.hemi}</td>
              <td className={tdCls + " font-semibold tabular-nums text-right pr-6"}>{row.count}</td>
              <td className={tdCls + " text-center"}>
                {row.isSig
                  ? <span className="text-sig font-bold text-sm">✓</span>
                  : <span className="text-ink2/30 text-sm">–</span>
                }
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-10 text-center text-ink2 font-sans text-sm">
                No significant ROIs at this threshold. Enable "Show all" to see all regions.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t border-rule/20 text-[11px] font-mono text-ink2">
        {rows.length} ROI{rows.length !== 1 ? "s" : ""} shown
      </div>
    </div>
  );
}
