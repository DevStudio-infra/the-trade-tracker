"use client";

import React from "react";
import { Input } from "./input";
import { Label } from "./label";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-md border border-input" style={{ backgroundColor: value }} />
      <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-28" />
      <Input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 p-1 cursor-pointer" />
    </div>
  );
};
