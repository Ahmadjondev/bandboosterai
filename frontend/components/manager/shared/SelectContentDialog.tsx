"use client";

import React, { useMemo, useEffect } from "react";
import { Modal } from "./Modal";
import { Badge } from "./Badge";

type ContentType = "reading" | "listening" | "writing" | "speaking";

interface Props {
  show: boolean;
  onClose: () => void;
  type: ContentType | null;
  position: number | null;
  loading?: boolean;
  onSelect: (item: any) => void;
  readingPassages?: any[];
  listeningParts?: any[];
  writingTasks?: any[];
  speakingTopics?: any[];
}

export function SelectContentDialog({
  show,
  onClose,
  type,
  position,
  loading = false,
  onSelect,
  readingPassages = [],
  listeningParts = [],
  writingTasks = [],
  speakingTopics = [],
}: Props) {
  const [search, setSearch] = React.useState("");

  // Debug: log when dialog opens
  useEffect(() => {
    if (show) {
      // eslint-disable-next-line no-console
      console.debug('[SelectContentDialog] Dialog opened', {
        type,
        position,
        readingPassagesCount: readingPassages.length,
        listeningPartsCount: listeningParts.length,
        writingTasksCount: writingTasks.length,
        speakingTopicsCount: speakingTopics.length,
      });
    }
  }, [show, type, position, readingPassages.length, listeningParts.length, writingTasks.length, speakingTopics.length]);

  const title = useMemo(() => {
    if (!type) return "Select Content";
    return `Select ${type.charAt(0).toUpperCase() + type.slice(1)} Content`;
  }, [type]);

  // Get source data based on type
  const sourceData = useMemo(() => {
    if (!type) return [];
    switch (type) {
      case "reading":
        return readingPassages;
      case "listening":
        return listeningParts;
      case "writing":
        return writingTasks;
      case "speaking":
        return speakingTopics;
      default:
        return [];
    }
  }, [type, readingPassages, listeningParts, writingTasks, speakingTopics]);

  // Filter by position
  const itemsByPosition = useMemo(() => {
    if (!type || position === null) return sourceData;

    return sourceData.filter((item: any) => {
      if (!item) return false;
      
      switch (type) {
        case "reading":
          return item.passage_number === position;
        case "listening":
          return item.part_number === position;
        case "writing":
          return item.task_type === (position === 1 ? "TASK_1" : "TASK_2");
        case "speaking":
          return item.speaking_type === `PART_${position}`;
        default:
          return true;
      }
    });
  }, [type, position, sourceData]);

  // Apply search filter
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return itemsByPosition;

    return itemsByPosition.filter((item: any) => {
      const text = (
        item.title ||
        item.prompt ||
        item.topic ||
        item.question ||
        ""
      ).toLowerCase();
      return text.includes(q);
    });
  }, [search, itemsByPosition]);

  // Render helpers
  const getDisplayTitle = (item: any) => {
    return item.title || item.prompt || item.topic || item.question || "Untitled";
  };

  const getDetailedInfo = (item: any) => {
    if (!type) return null;

    const info: { label: string; value: string }[] = [];

    switch (type) {
      case "reading":
        if (item.passage_number) info.push({ label: "Passage", value: `#${item.passage_number}` });
        if (item.word_count) info.push({ label: "Words", value: `${item.word_count}` });
        if (item.questions_count) info.push({ label: "Questions", value: `${item.questions_count}` });
        if (item.difficulty) info.push({ label: "Level", value: item.difficulty });
        break;
      case "listening":
        if (item.part_number) info.push({ label: "Part", value: `#${item.part_number}` });
        if (item.duration) info.push({ label: "Duration", value: `${item.duration} min` });
        if (item.questions_count) info.push({ label: "Questions", value: `${item.questions_count}` });
        if (item.difficulty) info.push({ label: "Level", value: item.difficulty });
        break;
      case "writing":
        if (item.task_type) info.push({ label: "Type", value: item.task_type });
        break;
      case "speaking":
        if (item.topic) info.push({ label: "Topic", value: item.topic });
        break;
    }

    return info;
  };

  const handleSelect = (item: any) => {
    // eslint-disable-next-line no-console
    console.debug('[SelectContentDialog] Selected item', item);
    onSelect(item);
  };

  if (!show) return null;

  return (
    <Modal show={show} onClose={onClose} title={title} size="large">
      <div className="space-y-4">
        {/* Search Input */}
        <div>
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Content List */}
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {loading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Loading content...</p>
            </div>
          )}

          {!loading && sourceData.length === 0 && (
            <div className="text-center py-8 text-red-500 space-y-2">
              <p className="font-medium">No content available for {type}</p>
              <p className="text-sm text-red-400">
                The parent form hasn't loaded any {type} content yet. This may indicate:
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Authentication issues (not logged into Manager panel)</li>
                <li>• No content created yet in the system</li>
                <li>• Parent form failed to fetch content from API</li>
              </ul>
            </div>
          )}

          {!loading && sourceData.length > 0 && filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No items match your search or position filter.</p>
            </div>
          )}

          {!loading &&
            filteredItems.map((item: any) => {
              const detailedInfo = getDetailedInfo(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full text-left p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md transition-all group"
                >
                  <div className="space-y-3">
                    {/* Title and Badge */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {getDisplayTitle(item)}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Badge
                          text={item.difficulty || item.difficulty_display || "MEDIUM"}
                          color="blue"
                        />
                      </div>
                    </div>

                    {/* Detailed Information Grid */}
                    {detailedInfo && detailedInfo.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {detailedInfo.map((info, idx) => (
                          <div key={idx} className="flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                              {info.label}
                            </span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {info.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Additional Description if available */}
                    {item.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </Modal>
  );
}

export default SelectContentDialog;
