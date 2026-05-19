import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes intelligently. shadcn-style helper. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
