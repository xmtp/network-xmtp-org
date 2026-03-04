import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/utils/cn';

const Tabs = TabsPrimitive.Root;

const TabsList = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cn(
      'flex items-center border-b border-zinc-800',
      className
    )}
    {...props}
  />
);

const TabsTrigger = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      'px-4 py-2 text-xs font-medium text-zinc-500 transition-colors',
      'border-b-2 border-transparent -mb-px',
      'hover:text-zinc-300',
      'data-[state=active]:border-zinc-300 data-[state=active]:text-zinc-100',
      'focus-visible:outline-none',
      className
    )}
    {...props}
  />
);

const TabsContent = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content
    className={cn('focus-visible:outline-none', className)}
    {...props}
  />
);

export { Tabs, TabsList, TabsTrigger, TabsContent };
