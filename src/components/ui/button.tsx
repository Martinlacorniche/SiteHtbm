"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
}) {
  const variants: Record<string, string> = {
    default: "bg-black text-white hover:opacity-90",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    outline: "border border-gray-300 hover:bg-gray-50",
    ghost: "hover:bg-gray-100",
  };
  const sizes: Record<string, string> = {
    default: "h-10 px-4 rounded-lg",
    sm: "h-9 px-3 rounded-lg text-sm",
    icon: "h-10 w-10 rounded-lg p-0",
  };
  return (
    <button
      className={cn("inline-flex items-center justify-center", variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
