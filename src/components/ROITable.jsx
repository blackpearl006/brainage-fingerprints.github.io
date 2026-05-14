import { useMemo, useState } from "react";
import { networkColors, sequentialColor } from "../lib/theme";

export default function ROITable({ regions, counts, sig, showAll = false, numCohorts = 1 }) {
  const [sortKey, setSortKey] = useState("count");
  const [sortDir, setSortDir] = useState(-1);

  const isIntersection = numCohorts > 1;

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

  const maxCount = rows.length ? Math.max(1, ...rows.map(r => r.count)) : 1;

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
            <th className={thCls} onClick={() => toggleSort("our_network7")}>Network</th>
            <th className={thCls} onClick={() => toggleSort("hemi")}>Hemi</th>
            <th className={thCls + " text-right pr-5"} onClick={() => toggleSort("count")}>
              {isIntersection ? `# Cohorts ↕` : `Count ↕`}
            </th>
            <th className={thCls + " text-center"}>Sig.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const barWidth = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
            const barColor = isIntersection
              ? sequentialColor(row.count / numCohorts)
              : sequentialColor(row.count / maxCount);

            return (
              <tr
                key={row.id}
                className={`border-b border-rule/10 hover:bg-paper transition-colors ${idx % 2 === 1 ? "bg-paper/40" : ""}`}
              >
                <td className={tdCls + " text-ink2"}>{row.id}</td>
                <td className={tdCls + " font-semibold text-ink"}>{row.label}</td>
                <td className={tdCls + " text-ink2 max-w-[200px]"}>
                  <span className="truncate block">{row.subregion}</span>
                </td>
                <td className={tdCls}>
                  <span
                    className="px-2 py-0.5 rounded-full text-white text-[10px] font-sans whitespace-nowrap"
                    style={{ background: networkColors[row.our_network7 === "nan" ? row.our_network20 : row.our_network7] ?? "#999" }}
                  >
                    {row.our_network7 === "nan" ? row.our_network20 : row.our_network7}
                  </span>
                </td>
                <td className={tdCls + " text-ink2 text-center"}>{row.hemi}</td>
                <td className={tdCls + " pr-5"}>
                  <div className="flex items-center gap-2 justify-end">
                    {/* Mini bar */}
                    <div className="w-16 h-1.5 rounded-full bg-rule/20 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barWidth}%`, background: barColor }}
                      />
                    </div>
                    <span className="font-semibold tabular-nums text-right w-6">
                      {isIntersection ? `${row.count}/${numCohorts}` : row.count}
                    </span>
                  </div>
                </td>
                <td className={tdCls + " text-center"}>
                  {row.isSig
                    ? <span className="text-sig font-bold text-sm">✓</span>
                    : <span className="text-ink2/30 text-sm">–</span>
                  }
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-10 text-center text-ink2 font-sans text-sm">
                No significant ROIs at this threshold.{" "}
                {!showAll && 'Enable “Show all” in Options to see all regions.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t border-rule/20 flex justify-between items-center">
        <span className="text-[11px] font-mono text-ink2">
          {rows.length} ROI{rows.length !== 1 ? "s" : ""} shown
        </span>
        {isIntersection && (
          <span className="text-[11px] font-mono text-sig font-semibold">
            ∩ Intersection mode — {numCohorts} cohorts
          </span>
        )}
      </div>
    </div>
  );
}
