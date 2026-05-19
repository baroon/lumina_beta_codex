import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Plus } from "lucide-react";
import { DISCOVERY_COPY } from "@/content/discovery";

interface AddCustomItemFormProps {
  placeholder: string;
  onAdd: (name: string) => void;
}

export function AddCustomItemForm({ placeholder, onAdd }: AddCustomItemFormProps) {
  const [value, setValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)} className="gap-1">
        <Plus className="h-3 w-3" />
        {DISCOVERY_COPY.buttons.addCustom}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
        autoFocus
      />
      <Button type="submit" size="sm" className="h-8" disabled={!value.trim()}>
        {DISCOVERY_COPY.customItem.add}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8"
        onClick={() => {
          setIsOpen(false);
          setValue("");
        }}
      >
        {DISCOVERY_COPY.customItem.cancel}
      </Button>
    </form>
  );
}
