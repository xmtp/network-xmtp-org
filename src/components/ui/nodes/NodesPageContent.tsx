import React, { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/base';
import { NodeTable } from './NodeTable';
import { NodeDetailsDialog } from './NodeDetailsDialog';
import { NetworkStatusBanner, StatusSummaryCards, TestnetReadOnlyAlert } from '@/components/ui/status';
import { isTestnet } from '@/config/network';
import { NodeData } from '@/types/nodes';
import { useNodeRegistry } from '@/hooks/contracts/useNodeRegistry';
import { useAllNodeStatuses, useNetworkStatus } from '@/hooks/nodes';
import { useMultipleNodeMetadata } from '@/hooks/nodes/useNodeMetadata';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export const NodesPageContent: React.FC = () => {
  const { getAllNodes, getTokenURI } = useNodeRegistry();

  // Local UI state
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOffline, setShowOffline] = useState(false);

  // Get all nodes from contract
  const nodes = getAllNodes.value || [];
  const isLoading = getAllNodes.isLoading;
  const error = getAllNodes.error;

  // Get node IDs for metadata fetching
  const nodeIds = useMemo(() => nodes.map((n) => n.nodeId), [nodes]);

  // Fetch metadata and statuses
  const { metadataMap } = useMultipleNodeMetadata(nodeIds, getTokenURI);
  const { statuses, refresh, isChecking } = useAllNodeStatuses(nodes);

  // Calculate network status from canonical nodes
  const networkStatusInfo = useNetworkStatus(nodes, statuses);

  // Helper to get operator name from metadata
  const getOperatorName = useCallback((nodeId: number): string => {
    const metadata = metadataMap.get(nodeId);
    return metadata?.operator_name || '';
  }, [metadataMap]);

  // Filter function for nodes
  const filterNodes = useCallback((nodeList: NodeData[], query: string): NodeData[] => {
    if (!query.trim()) return nodeList;
    const q = query.toLowerCase();
    return nodeList.filter((node) => {
      const operatorName = getOperatorName(node.nodeId);
      const health = statuses.get(node.nodeId);
      return (
        node.nodeId.toString().includes(q) ||
        node.httpAddress.toLowerCase().includes(q) ||
        node.owner.toLowerCase().includes(q) ||
        operatorName.toLowerCase().includes(q) ||
        (health?.version?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [getOperatorName, statuses]);

  // Sort and organize nodes: Active online, Standby online, then offline
  const sortedNodes = useMemo(() => {
    const activeOnline: NodeData[] = [];
    const standbyOnline: NodeData[] = [];
    const offline: NodeData[] = [];

    nodes.forEach((node) => {
      const health = statuses.get(node.nodeId);
      const isOnline = health?.status === 'online';

      if (isOnline) {
        if (node.isCanonical) {
          activeOnline.push(node);
        } else {
          standbyOnline.push(node);
        }
      } else {
        offline.push(node);
      }
    });

    return { activeOnline, standbyOnline, offline };
  }, [nodes, statuses]);

  // Filtered nodes for display
  const filteredActiveOnline = useMemo(
    () => filterNodes(sortedNodes.activeOnline, searchQuery),
    [sortedNodes.activeOnline, searchQuery, filterNodes]
  );
  const filteredStandbyOnline = useMemo(
    () => filterNodes(sortedNodes.standbyOnline, searchQuery),
    [sortedNodes.standbyOnline, searchQuery, filterNodes]
  );
  const filteredOffline = useMemo(
    () => filterNodes(sortedNodes.offline, searchQuery),
    [sortedNodes.offline, searchQuery, filterNodes]
  );

  const handleNodeClick = (node: NodeData) => {
    setSelectedNode(node);
    setDetailsOpen(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-400 mb-4">Error loading nodes: {error}</p>
        <button onClick={() => getAllNodes.refetch()} className="text-zinc-400 hover:text-zinc-200 transition-colors">
          Try again
        </button>
      </div>
    );
  }

  const hasOnlineNodes = filteredActiveOnline.length > 0 || filteredStandbyOnline.length > 0;
  const hasOfflineNodes = filteredOffline.length > 0;
  const totalOnline = filteredActiveOnline.length + filteredStandbyOnline.length;

  return (
    <div className="space-y-6">
      {/* Network Status Banner */}
      {isTestnet ? (
        <TestnetReadOnlyAlert />
      ) : (
        <NetworkStatusBanner
          statusInfo={networkStatusInfo}
          onRefresh={refresh}
          isRefreshing={isChecking}
        />
      )}

      {/* Status Summary Cards */}
      <StatusSummaryCards statusInfo={networkStatusInfo} />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-lg bg-zinc-800" />
          <Skeleton className="h-64 w-full rounded-lg bg-zinc-800" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by ID, operator, address, version..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-zinc-800 rounded-lg text-sm bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-colors"
            />
          </div>

          {/* Node List */}
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900 overflow-hidden ring-1 ring-zinc-800/50">
            {/* Online Nodes */}
            {hasOnlineNodes ? (
              <div>
                <div className="px-4 py-3 border-b border-zinc-800/50 bg-zinc-900/50">
                  <h2 className="text-sm font-medium text-zinc-300">
                    Online Nodes
                    <span className="ml-2 text-zinc-500 font-normal">
                      ({totalOnline})
                    </span>
                  </h2>
                </div>
                <NodeTable
                  nodes={[...filteredActiveOnline, ...filteredStandbyOnline]}
                  metadataMap={metadataMap}
                  statusMap={statuses}
                  onNodeClick={handleNodeClick}
                />
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500">
                {searchQuery ? 'No online nodes match your search' : 'No online nodes'}
              </div>
            )}

            {/* Offline Nodes - Expandable */}
            {hasOfflineNodes && (
              <div className="border-t border-zinc-800/50">
                <button
                  onClick={() => setShowOffline(!showOffline)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:ring-inset"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-500">
                      Offline Nodes
                    </span>
                    <span className="text-sm text-zinc-600">
                      ({filteredOffline.length})
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-zinc-500 transition-transform duration-200',
                      showOffline && 'rotate-180'
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-200 ease-out',
                    showOffline ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <div className="overflow-hidden">
                    <NodeTable
                      nodes={filteredOffline}
                      metadataMap={metadataMap}
                      statusMap={statuses}
                      onNodeClick={handleNodeClick}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {nodes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-zinc-500">No nodes registered on the network</p>
            </div>
          )}
        </div>
      )}

      {/* Details Dialog */}
      <NodeDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        node={selectedNode}
        metadata={selectedNode ? metadataMap.get(selectedNode.nodeId) : undefined}
        health={selectedNode ? statuses.get(selectedNode.nodeId) : undefined}
      />
    </div>
  );
};
