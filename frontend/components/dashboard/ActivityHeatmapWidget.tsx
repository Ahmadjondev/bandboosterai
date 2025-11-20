"use client";

import React, { useMemo } from "react";
import { ActivityHeatmap } from "@/lib/exam-api";
import { Calendar, Flame } from "lucide-react";

interface ActivityHeatmapWidgetProps {
  heatmap: ActivityHeatmap;
}

/**
 * GitHub-style activity heatmap component
 * - Weeks = columns, Days = rows (Sunday -> Saturday)
 * - 12px squares with ~3px gap
 * - Month labels aligned above the week column when the month starts
 * - Small centered count inside squares (shown only when count > 0)
 */
export default function ActivityHeatmapWidget({
  heatmap,
}: ActivityHeatmapWidgetProps) {
  const { data = [], total_active_days = 0, most_active_day, current_streak = 0 } =
    heatmap || {};

  // Map the incoming data by date for quick lookup: 'YYYY-MM-DD' -> {date, count, level}
  const dateMap = useMemo(() => {
    const m = new Map<string, { date: string; count: number; level: number }>();
    (data || []).forEach((d: any) => {
      m.set(d.date, d);
    });
    return m;
  }, [data]);

  // Utility: format date to YYYY-MM-DD
  const toYMD = (d: Date) => d.toISOString().split("T")[0];

  // Prepare full-year grid (365 days = ~52 weeks)
 const { weeks, monthPositions } = useMemo(() => {
  const weeksArr: Array<Array<{ date: string; count: number; level: number }>> = [];

  if (data.length === 0) {
    return { weeks: weeksArr, monthPositions: [] };
  }

  // 1) Earliest date from API
  const earliest = new Date(data[0].date);
  earliest.setHours(0, 0, 0, 0);

  // Align to previous Sunday
  const start = new Date(earliest);
  start.setDate(start.getDate() - start.getDay()); // move to Sunday

  // 2) Latest date from API
  const latest = new Date(data[data.length - 1].date);
  latest.setHours(0, 0, 0, 0);

  // 3) Add future placeholders until next Saturday
  const end = new Date(latest);
  const padding = 6 - end.getDay(); // until Saturday
  end.setDate(end.getDate() + padding);

  // 4) Build weeks left → right
  let cursor = new Date(start);
  while (cursor <= end) {
    const week: Array<{ date: string; count: number; level: number }> = [];

    for (let i = 0; i < 7; i++) {
      const dateStr = toYMD(cursor);
      const day = dateMap.get(dateStr) ?? {
        date: dateStr,
        count: 0,
        level: 0,
      };
      week.push(day);
      cursor.setDate(cursor.getDate() + 1);
    }

    weeksArr.push(week);
  }

  // 5) Month label alignment (GitHub accurate)
  const monthPos: Array<{ name: string; offset: number }> = [];
  const used = new Set<string>();

  weeksArr.forEach((week, index) => {
    // Check if this week contains the 1st of a month
    const match = week.find((d) => new Date(d.date).getDate() === 1);
    if (match) {
      const dt = new Date(match.date);
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      if (!used.has(key)) {
        monthPos.push({
          name: dt.toLocaleString("en-US", { month: "short" }),
          offset: index * 15, // cell 12px + gap 3px
        });
        used.add(key);
      }
      return; // skip fallback check
    }

    // Fallback: place month label on first appearance of each month inside the range
    const firstDay = new Date(week[0].date);
    const key = `${firstDay.getFullYear()}-${firstDay.getMonth()}`;
    if (!used.has(key)) {
      monthPos.push({
        name: firstDay.toLocaleString("en-US", { month: "short" }),
        offset: index * 15,
      });
      used.add(key);
    }
  });

  return { weeks: weeksArr, monthPositions: monthPos };
}, [data, dateMap]);


  const getColorClass = (level: number) => {
    // GitHub-style color progression: gray -> light green -> medium green -> dark green -> darkest green
    switch (level) {
      case 0:
        return "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700";
      case 1:
        return "bg-emerald-200 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800";
      case 2:
        return "bg-emerald-400 dark:bg-emerald-700/60 border border-emerald-500 dark:border-emerald-600";
      case 3:
        return "bg-emerald-500 dark:bg-emerald-600/80 border border-emerald-600 dark:border-emerald-500";
      case 4:
        return "bg-emerald-600 dark:bg-emerald-500 border border-emerald-700 dark:border-emerald-400";
      default:
        return "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700";
    }
  };

  // Month labels width offset left padding to align with the grid start (account for weekday labels width).
  const weekdayLabelWidth = 40; // px reserved on left for weekday labels

  // Calculate date range for display
  const dateRange = useMemo(() => {
    if (weeks.length === 0) return "";
    const firstDate = new Date(weeks[0][0].date);
    const lastWeek = weeks[weeks.length - 1];
    const lastDate = new Date(lastWeek[lastWeek.length - 1].date);
    return `${firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }, [weeks]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Activity Heatmap
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-9">
          {total_active_days} {total_active_days === 1 ? "day" : "days"} of activity in the last year
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {total_active_days}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            Active Days
          </div>
        </div>
        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-orange-700 dark:text-orange-300">
            <Flame className="w-6 h-6" />
            {current_streak}
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            Day Streak
          </div>
        </div>
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {Math.round((total_active_days / 365) * 100)}%
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Consistency
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="relative pl-10">
          {/* Month labels (positioned above the grid) */}
          <div
            className="flex items-start relative mb-1"
            style={{ height: 20, marginLeft: weekdayLabelWidth }}
          >
            {monthPositions.map((m, idx) => (
              <div
                key={idx}
                className="absolute text-xs font-medium text-gray-600 dark:text-gray-400"
                style={{ left: `${m.offset}px` }}
              >
                {m.name}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Weekday labels column (vertical) - Show only Mon, Wed, Fri like GitHub */}
            <div className="flex flex-col justify-between mr-2" style={{ width: weekdayLabelWidth }}>
              {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                <div key={i} className="h-3 text-[10px] text-gray-500 dark:text-gray-400 flex items-center">
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks (columns) */}
            <div className="flex">
              {weeks.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  className="flex flex-col gap-[3px] mr-[3px]"
                  // prevent shrinking so grid width remains stable
                  style={{ flexShrink: 0 }}
                >
                  {week.map((day, dayIndex) => {
                    const date = new Date(day.date);

                    // determine faded style if day is outside current year window relative to today
                    // Example: keep visual but slightly faded if count===0; (you can adjust logic if needed)
                    const isPlaceholder = day.count === 0 && !dateMap.has(day.date);

                    return (
                      <div
                        key={dayIndex}
                        className={`w-[12px] h-[12px] rounded-sm flex items-center justify-center relative group ${getColorClass(
                          day.level
                        )} ${isPlaceholder ? "opacity-40" : ""}`}
                        title={`${date.toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}\n${day.count} test${day.count !== 1 ? "s" : ""}`}
                      >
                        {day.count > 0 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-semibold text-white">
                            {day.count}
                          </span>
                        )}

                        {/* Tooltip - positioned below */}
                        <div className="absolute top-full mt-2 hidden group-hover:block z-20 left-1/2 -translate-x-1/2">
                          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-3 py-2 whitespace-nowrap shadow-lg">
                            <div className="font-medium">
                              {date.toLocaleDateString("en-US", { 
                                weekday: "short",
                                month: "short", 
                                day: "numeric",
                                year: "numeric"
                              })}
                            </div>
                            <div className="text-gray-300 mt-0.5">
                              {day.count} {day.count === 1 ? "test" : "tests"} completed
                            </div>
                          </div>
                          {/* Arrow pointing up */}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-[12px] h-[12px] rounded-sm ${getColorClass(level)}`}
              />
            ))}
            <span className="text-xs text-gray-500 dark:text-gray-400">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
