import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/atoms/select";
import { Plus } from "lucide-react";
import { DISCOVERY_COPY } from "@/content/discovery";

interface TypeOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface AddCustomItemFormProps {
  placeholder: string;
  onAdd: (name: string, metadata?: Record<string, string>) => void;
  typeOptions?: TypeOption[];
  metadataKey?: string;
  typeRequired?: boolean;
  captureDomain?: boolean;
}

export function AddCustomItemForm({
  placeholder,
  onAdd,
  typeOptions,
  metadataKey = "productType",
  typeRequired = false,
  captureDomain = false,
}: AddCustomItemFormProps) {
  const [value, setValue] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [domain, setDomain] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const metadata: Record<string, string> = {};
    if (typeOptions && selectedType) metadata[metadataKey] = selectedType;
    if (captureDomain && domain.trim()) metadata.domain = domain.trim();
    onAdd(value.trim(), Object.keys(metadata).length > 0 ? metadata : undefined);
    setValue("");
    setSelectedType("");
    setDomain("");
    setIsOpen(false);
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
      {captureDomain && (
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder={DISCOVERY_COPY.customItem.domainPlaceholder}
          className="h-8 text-sm"
        />
      )}
      {typeOptions && (
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger selectSize="sm" className="min-w-[7rem] shrink-0">
            <SelectValue placeholder={DISCOVERY_COPY.customItem.typePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} icon={opt.icon}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button
        type="submit"
        size="sm"
        className="h-8"
        disabled={!value.trim() || (typeRequired && !selectedType)}
      >
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
          setSelectedType("");
          setDomain("");
        }}
      >
        {DISCOVERY_COPY.customItem.cancel}
      </Button>
    </form>
  );
}

export type { TypeOption };
