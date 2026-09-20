"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

/**
 * A password-style input for a secret that's never sent back down from the
 * server after saving — only a boolean "is one saved" flag. Leaving it
 * blank and saving keeps whatever is already stored; typing a new value
 * replaces it.
 */
export function SecretField({
  label,
  isSet,
  value,
  onChange,
  helperText,
}: {
  label: string;
  isSet: boolean;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Label>{label}</Label>
        {isSet && (
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" /> Saved
          </Badge>
        )}
      </div>
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isSet ? "Leave blank to keep the saved value" : "Not set"}
      />
      {helperText && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
