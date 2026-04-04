import { useState, useCallback, useMemo, useEffect } from "react";

interface PowerOutageRequest {
  id: number;
}

export const useRequestSelection = (requests: PowerOutageRequest[]) => {
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);

  useEffect(() => {
    const visibleRequestIds = new Set(requests.map((request) => request.id));
    setSelectedRequests((prev) =>
      prev.filter((requestId) => visibleRequestIds.has(requestId)),
    );
  }, [requests]);

  const selectAll = useMemo(
    () =>
      requests.length > 0 &&
      requests.every((request) => selectedRequests.includes(request.id)),
    [requests, selectedRequests],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedRequests(
      selectAll ? [] : requests.map((request) => request.id),
    );
  }, [selectAll, requests]);

  const handleSelectRequest = useCallback(
    (id: number) => {
      const isCurrentlySelected = selectedRequests.includes(id);
      const newSelectedRequests = isCurrentlySelected
        ? selectedRequests.filter((reqId) => reqId !== id)
        : [...selectedRequests, id];

      setSelectedRequests(newSelectedRequests);
    },
    [selectedRequests, requests],
  );

  const clearSelection = useCallback(() => {
    setSelectedRequests([]);
  }, []);

  return {
    selectedRequests,
    selectAll,
    handleSelectAll,
    handleSelectRequest,
    clearSelection,
  };
};
