"use client";

/**
 * Custom Tabs implementation using React Context API.
 *
 * Replaces the previous cloneElement-based prop drilling approach.
 * Public API surface is unchanged: Tabs, TabsList, TabsTrigger, TabsContent.
 */

import * as React from "react";

// ---- Context ----------------------------------------------------------------

interface TabsContextValue {
  activeTab: string | undefined;
  setActiveTab: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs sub-components must be used inside <Tabs>.");
  }
  return ctx;
}

// ---- Tabs (root) -------------------------------------------------------------

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
}

export function Tabs({ defaultValue, className, children, ...props }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState<string | undefined>(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className ?? ""} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// ---- TabsList ---------------------------------------------------------------

export function TabsList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={`inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur ${
        className ?? ""
      }`}
      {...props}
    >
      {children}
    </div>
  );
}

// ---- TabsTrigger ------------------------------------------------------------

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ className, value, children, ...props }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      id={`tab-${value}`}
      tabIndex={isActive ? 0 : -1}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(36,93,66,0.25)] disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? "bg-pea-700 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      } ${className ?? ""}`}
      onClick={() => setActiveTab(value)}
      {...props}
    >
      {children}
    </button>
  );
}

// ---- TabsContent ------------------------------------------------------------

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={`mt-3 ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
}
