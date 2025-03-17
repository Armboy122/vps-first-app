"use client";

import * as React from "react";

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
}

export function Tabs({ defaultValue, className, ...props }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  return (
    <div className={`${className || ""}`} {...props} data-active-tab={activeTab}>
      {React.Children.map(props.children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeTab,
            setActiveTab,
          });
        }
        return child;
      })}
    </div>
  );
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  activeTab?: string;
  setActiveTab?: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export function TabsList({ className, children, activeTab, setActiveTab, ...props }: TabsListProps) {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${
        className || ""
      }`}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeTab,
            setActiveTab,
          });
        }
        return child;
      })}
    </div>
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  activeTab?: string;
  setActiveTab?: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export function TabsTrigger({
  className,
  value,
  activeTab,
  setActiveTab,
  ...props
}: TabsTriggerProps) {
  const isActive = activeTab === value;

  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? "bg-white text-blue-700 shadow-sm"
          : "text-gray-600 hover:text-gray-900"
      } ${className || ""}`}
      onClick={() => setActiveTab?.(value)}
      {...props}
    />
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  activeTab?: string;
  setActiveTab?: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export function TabsContent({
  className,
  value,
  activeTab,
  setActiveTab,
  ...props
}: TabsContentProps) {
  const isActive = activeTab === value;

  if (!isActive) return null;

  return <div className={`mt-2 ${className || ""}`} {...props} />;
} 