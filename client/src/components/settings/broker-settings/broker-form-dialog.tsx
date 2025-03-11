import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSettings } from "@/lib/api/settings";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface BrokerFormData {
  broker_name: string;
  credentials: {
    apiKey: string;
    identifier: string;
    password: string;
    is_demo: boolean;
  };
}

interface BrokerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBroker: UserSettings["broker_credentials"][0] | null;
  onSubmit: (data: BrokerFormData) => Promise<void>;
}

export function BrokerFormDialog({ open, onOpenChange, editingBroker, onSubmit }: BrokerFormDialogProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<BrokerFormData>({
    broker_name: editingBroker?.broker_name || "",
    credentials: {
      apiKey: editingBroker?.credentials.apiKey || "",
      identifier: editingBroker?.credentials.identifier || "",
      password: editingBroker?.credentials.password || "",
      is_demo: editingBroker?.is_demo || false,
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setFormData({
      broker_name: "",
      credentials: {
        apiKey: "",
        identifier: "",
        password: "",
        is_demo: false,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingBroker ? "Edit Broker Connection" : "Add New Broker"}</DialogTitle>
          <DialogDescription>{editingBroker ? "Update your broker connection settings." : "Connect a new broker to start trading."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="broker">Broker</Label>
            <Select
              disabled={!!editingBroker}
              value={formData.broker_name}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  broker_name: value,
                  credentials: {
                    apiKey: "",
                    identifier: "",
                    password: "",
                    is_demo: false,
                  },
                })
              }>
              <SelectTrigger>
                <SelectValue placeholder="Select a broker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="capital_com">Capital.com</SelectItem>
                <SelectItem value="other" disabled>
                  More brokers coming soon
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(editingBroker?.broker_name === "capital_com" || formData.broker_name === "capital_com") && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={formData.credentials.apiKey}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, apiKey: e.target.value },
                      })
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="identifier">Identifier</Label>
                <Input
                  id="identifier"
                  value={formData.credentials.identifier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, identifier: e.target.value },
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.credentials.password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, password: e.target.value },
                      })
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(formData)}>{editingBroker ? "Save Changes" : "Add Broker"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
