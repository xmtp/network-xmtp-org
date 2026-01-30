import React from 'react';
import { cn } from '@/utils/cn';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface TestnetReadOnlyAlertProps {
  className?: string;
}

export const TestnetReadOnlyAlert: React.FC<TestnetReadOnlyAlertProps> = ({
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900/50 flex overflow-hidden',
        className
      )}
    >
      <div className="w-1 bg-amber-500 flex-shrink-0" />
      <div className="flex-1 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-100">
              Testnet is in read-only mode
            </p>
            <p className="text-sm text-zinc-500">
              The network is being pre-seeded with historical messages. During this phase, new messages can only be sent in the testnet{' '}
              <a
                href="https://github.com/xmtp/smart-contracts/blob/main/environments/testnet-staging.json"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-zinc-300 underline underline-offset-2 transition-colors"
              >
                staging environment
              </a>
              .
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-1">
              <a
                href="https://xmtp.org/decentralization"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-500/80 hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                Learn about XMTP's decentralization plan
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://improve.xmtp.org/t/decentralization-milestones/2039"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-500/80 hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                View testnet progress and milestones
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
