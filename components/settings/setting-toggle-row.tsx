import * as React from "react";
import { Switch } from "@/components/ui/switch";

export interface SettingToggleRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SettingToggleRow({ id, label, description, checked, onCheckedChange }: SettingToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-medium text-text-primary">
          {label}
        </label>
        {description && <p className="text-xs text-text-muted">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
