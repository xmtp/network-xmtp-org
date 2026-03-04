import { Address } from 'viem';

/**
 * On-chain node data from the NodeRegistry contract
 */
export interface NodeData {
  /** Unique identifier for the node (starts at 100, increments by 100) */
  nodeId: number;

  /** Address derived from the signing public key */
  signer: Address;

  /** Whether the node is part of the canonical network */
  isCanonical: boolean;

  /** The public key used for node signing/verification */
  signingPublicKey: `0x${string}`;

  /** The HTTP endpoint address for the node */
  httpAddress: string;

  /** The owner address of the node NFT */
  owner: Address;
}

/**
 * Raw node data from the contract (before owner lookup)
 */
export interface RawNodeData {
  nodeId: number;
  node: {
    signer: Address;
    isCanonical: boolean;
    signingPublicKey: `0x${string}`;
    httpAddress: string;
  };
}

/**
 * Node health status from GRPC health checks
 */
export type NodeStatus = 'online' | 'offline' | 'error' | 'unknown';

/**
 * Result from a node health check
 */
export interface NodeHealthResult {
  /** Node identifier */
  nodeId: number;

  /** HTTP address that was checked */
  httpAddress: string;

  /** Current health status */
  status: NodeStatus;

  /** Node software version (if online) */
  version?: string;

  /** Response latency in milliseconds (if online) */
  latencyMs?: number;

  /** Timestamp of the last health check */
  lastChecked: Date;

  /** Error message (if status is error) */
  error?: string;
}

/**
 * NFT metadata schema for node tokens (from tokenURI)
 * Note: Node name is derived from contract as "XMTP Node #<nodeId>"
 */
export interface NodeMetadata {
  /** Description of the node */
  description: string;

  /** Image URL for the node avatar */
  image?: string;

  /** External URL for the node operator */
  external_url?: string;

  /** Operator display name */
  operator_name?: string;

  /** Geographic region (e.g., "US-East", "EU-West") */
  region?: string;

  /** Social links */
  social?: {
    twitter?: string;
    discord?: string;
    convos?: string;
  };
}

/**
 * Combined node data with metadata and health status
 */
export interface NodeWithStatus extends NodeData {
  /** NFT metadata (from tokenURI) */
  metadata?: NodeMetadata | null;

  /** Current health status */
  health?: NodeHealthResult;
}

/**
 * Vector clock returned by GetSyncCursor, mapping node IDs to sequence IDs
 */
export interface NodeVectorClock {
  /** Map of nodeId (as string) to sequenceId (as string, may be large int64) */
  nodeIdToSequenceId: Record<string, string>;
}

/**
 * Filter options for node list
 */
export type NodeFilterType = 'all' | 'canonical' | 'community';

/**
 * Network status based on canonical node health
 * - operational: ≥80% canonical nodes online
 * - degraded: 50-79% canonical nodes online
 * - major-outage: 1-49% canonical nodes online
 * - outage: 0% canonical nodes online
 */
export type NetworkStatus = 'operational' | 'degraded' | 'major-outage' | 'outage';

/**
 * Network status information including counts and metadata
 */
export interface NetworkStatusInfo {
  /** Current network status */
  status: NetworkStatus;

  /** Number of canonical nodes online */
  canonicalOnline: number;

  /** Total number of canonical nodes */
  canonicalTotal: number;

  /** Number of community nodes online */
  communityOnline: number;

  /** Total number of community nodes */
  communityTotal: number;

  /** Average latency in milliseconds (from online nodes) */
  averageLatencyMs: number | null;

  /** Timestamp of the last status check */
  lastChecked: Date | null;
}
