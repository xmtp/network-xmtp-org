import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/base';
import { NodeStatusBadge } from './NodeStatusBadge';
import { NodeData, NodeMetadata, NodeHealthResult, NodeVectorClock } from '@/types/nodes';
import { useFormatters } from '@/hooks/utils/useFormatters';
import { ExternalLink, Copy, Check, MapPin, MessageCircle, AlertCircle } from 'lucide-react';
import { DIALOG_STYLES } from '@/utils/dialogStyles';
import { cn } from '@/utils/cn';
import { getNodeSyncCursor } from '@/lib/grpc/nodeVectorClock';

interface NodeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: NodeData | null;
  metadata?: NodeMetadata | null;
  health?: NodeHealthResult;
}

export const NodeDetailsDialog: React.FC<NodeDetailsDialogProps> = ({
  open,
  onOpenChange,
  node,
  metadata,
  health,
}) => {
  const { formatAddress } = useFormatters();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [vectorClock, setVectorClock] = useState<NodeVectorClock | null>(null);
  const [vectorClockLoading, setVectorClockLoading] = useState(false);
  const [vectorClockError, setVectorClockError] = useState<string | null>(null);

  // Fetch vector clock when dialog opens; reset on close or node change
  useEffect(() => {
    if (!open || !node) {
      setVectorClock(null);
      setVectorClockError(null);
      setVectorClockLoading(false);
      return;
    }

    setVectorClock(null);
    setVectorClockError(null);
    setVectorClockLoading(true);

    let cancelled = false;

    getNodeSyncCursor(node.nodeId, node.httpAddress)
      .then((clock) => {
        if (!cancelled) {
          setVectorClock(clock);
          setVectorClockLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setVectorClockError(err.message ?? 'Failed to fetch sync cursor');
          setVectorClockLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, node?.nodeId]);

  if (!node) return null;

  const operatorName = metadata?.operator_name || null;
  const displayName = operatorName || `Node #${node.nodeId}`;
  const region = metadata?.region || null;
  const discord = metadata?.social?.discord || null;
  const avatarUrl = metadata?.image || undefined;
  const status = health?.status || 'unknown';
  const nodeType = node.isCanonical ? 'Active' : 'Standby';

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 hover:bg-zinc-800"
      onClick={() => copyToClipboard(text, field)}
      title="Copy to clipboard"
    >
      {copiedField === field ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 text-zinc-500" />
      )}
    </Button>
  );

  // Sort vector clock entries numerically by node ID
  const sortedClockEntries = vectorClock
    ? Object.entries(vectorClock.nodeIdToSequenceId).sort(
        ([a], [b]) => Number(a) - Number(b)
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-[calc(100vw-40px)] max-w-lg',
          DIALOG_STYLES.padding,
          DIALOG_STYLES.shadow,
          DIALOG_STYLES.contentScrollable
        )}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg font-medium text-zinc-100">{displayName}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {nodeType} Node · #{node.nodeId}
          </DialogDescription>
        </DialogHeader>

        {/* Header with avatar and status */}
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="bg-zinc-800 text-zinc-400 text-base font-mono">
              {node.nodeId}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 flex items-center justify-between">
            <NodeStatusBadge status={status} health={health} showLabel />
            {region && (
              <div className="flex items-center gap-1.5 text-zinc-500">
                <MapPin className="h-4 w-4" />
                <span className="text-xs">{region}</span>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="sync-clock">Sync Clock</TabsTrigger>
          </TabsList>

          {/* ── Details tab ── */}
          <TabsContent value="details">
            <div className={cn('space-y-6', DIALOG_STYLES.contentGap)}>
              {/* Description */}
              {metadata?.description && (
                <div>
                  <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">
                    Description
                  </span>
                  <p className="text-sm text-zinc-300">{metadata.description}</p>
                </div>
              )}

              {/* Details grid */}
              <div className="space-y-0">
                <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                  <span className="text-xs text-zinc-500">HTTP Address</span>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-xs font-mono text-zinc-300 max-w-[250px] truncate"
                      title={node.httpAddress}
                    >
                      {node.httpAddress}
                    </span>
                    <CopyButton text={node.httpAddress} field="httpAddress" />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                  <span className="text-xs text-zinc-500">Owner</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-zinc-300">{formatAddress(node.owner)}</span>
                    <CopyButton text={node.owner} field="owner" />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                  <span className="text-xs text-zinc-500">Signer</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-zinc-300">{formatAddress(node.signer)}</span>
                    <CopyButton text={node.signer} field="signer" />
                  </div>
                </div>

                {health?.version && (
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                    <span className="text-xs text-zinc-500">Version</span>
                    <span className="text-xs text-zinc-300">{health.version}</span>
                  </div>
                )}

                {health?.latencyMs !== undefined && (
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                    <span className="text-xs text-zinc-500">Latency</span>
                    <span className="text-xs text-zinc-300">{health.latencyMs}ms</span>
                  </div>
                )}

                {health?.lastChecked && (
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                    <span className="text-xs text-zinc-500">Last Checked</span>
                    <span className="text-xs text-zinc-300">{health.lastChecked.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Signing public key */}
              <div>
                <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block mb-2">
                  Signing Public Key
                </span>
                <div className="bg-zinc-800/50 rounded-lg p-3 flex items-center gap-2 ring-1 ring-zinc-700/50">
                  <span className="font-mono break-all flex-1 text-[10px] text-zinc-400">
                    {node.signingPublicKey}
                  </span>
                  <CopyButton text={node.signingPublicKey} field="publicKey" />
                </div>
              </div>

              {/* External links */}
              {(metadata?.external_url ||
                metadata?.social?.twitter ||
                discord ||
                metadata?.social?.convos) && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {metadata?.external_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(metadata.external_url, '_blank')}
                      className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </Button>
                  )}

                  {metadata?.social?.twitter && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `https://twitter.com/${metadata.social!.twitter!.replace('@', '')}`,
                          '_blank'
                        )
                      }
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-0"
                    >
                      Twitter
                    </Button>
                  )}

                  {discord && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const discordUrl = discord.startsWith('http')
                          ? discord
                          : `https://discord.gg/${discord}`;
                        window.open(discordUrl, '_blank');
                      }}
                      className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-0"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Discord
                    </Button>
                  )}

                  {metadata?.social?.convos && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const convos = metadata.social!.convos!;
                        const convosUrl = convos.startsWith('http')
                          ? convos
                          : `https://converse.xyz/dm/${convos}`;
                        window.open(convosUrl, '_blank');
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-0"
                    >
                      Convos
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Sync Clock tab ── */}
          <TabsContent value="sync-clock">
            <div className="pt-4 space-y-3">
              <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                Vector Clock · GetSyncCursor
              </p>

              {vectorClockLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  ))}
                </div>
              )}

              {!vectorClockLoading && vectorClockError && (
                <div className="flex items-start gap-2 rounded-lg bg-zinc-800/50 p-3 ring-1 ring-zinc-700/50">
                  <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-300 font-medium">Failed to fetch sync cursor</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{vectorClockError}</p>
                  </div>
                </div>
              )}

              {!vectorClockLoading && !vectorClockError && vectorClock && (
                <div className="space-y-0 rounded-lg bg-zinc-800/30 ring-1 ring-zinc-700/50 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-800/50">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      Node ID
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      Sequence ID
                    </span>
                  </div>
                  {sortedClockEntries.length === 0 ? (
                    <p className="text-xs text-zinc-500 px-3 py-4 text-center">No entries</p>
                  ) : (
                    sortedClockEntries.map(([nodeId, seqId], idx) => (
                      <div
                        key={nodeId}
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5',
                          idx !== sortedClockEntries.length - 1 && 'border-b border-zinc-800/50'
                        )}
                      >
                        <span className="text-xs font-mono text-zinc-400">{nodeId}</span>
                        <span className="text-xs font-mono text-zinc-300 tabular-nums">
                          {Number(seqId).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
