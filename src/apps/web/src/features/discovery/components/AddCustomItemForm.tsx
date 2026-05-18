import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

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
        Add Custom
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
        Add
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
        Cancel
      </Button>
    </form>
  );
}
