'use client';

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Command,
  ClipboardCheck,
  Copy,
  CreditCard,
  File,
  FileText,
  HelpCircle,
  Image,
  Laptop,
  Loader2,
  LucideProps,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Pizza,
  Settings,
  SunMedium,
  Trash,
  Twitter,
  User,
  X,
  LogOut,
  type Icon as LucideIcon
} from "lucide-react";

export type Icon = typeof LucideIcon;

export type IconProps = React.HTMLAttributes<SVGElement>;

export const Icons = {
  logo: Command,
  close: X,
  spinner: Loader2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronsUpDown: ChevronsUpDown,
  trash: Trash,
  settings: Settings,
  user: User,
  arrowRight: ArrowRight,
  help: HelpCircle,
  laptop: Laptop,
  moon: Moon,
  sun: SunMedium,
  warning: AlertTriangle,
  check: Check,
  checkCircle: CheckCircle,
  copy: Copy,
  file: File,
  fileText: FileText,
  plus: Plus,
  creditCard: CreditCard,
  moreVertical: MoreVertical,
  image: Image,
  twitter: Twitter,
  logout: LogOut,
}; 