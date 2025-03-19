import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSettings } from "@/lib/api/settings";
import { Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface BrokerFormData {
  broker_name: string;
  description: string;
  is_demo: boolean;
  credentials: {
    apiKey: string;
    identifier: string;
    password: string;
  };
}

interface BrokerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBroker: UserSettings["broker_credentials"][0] | null;
  onSubmit: (data: BrokerFormData) => Promise<void>;
}

export function BrokerFormDialog({ open, onOpenChange, editingBroker, onSubmit }: BrokerFormDialogProps) {
  console.log("BrokerFormDialog rendered with editingBroker:", {
    id: editingBroker?.id,
    broker_name: editingBroker?.broker_name,
    description: editingBroker?.description,
    is_demo: editingBroker?.is_demo,
    credentials: editingBroker?.credentials
      ? {
          hasApiKey: !!editingBroker.credentials.apiKey,
          hasIdentifier: !!editingBroker.credentials.identifier,
          hasPassword: !!editingBroker.credentials.password,
        }
      : null,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<BrokerFormData>(() => {
    console.log("Initializing form data state");
    return {
      broker_name: "",
      description: "",
      is_demo: false,
      credentials: {
        apiKey: "",
        identifier: "",
        password: "",
      },
    };
  });

  // Update form data when editingBroker changes
  useEffect(() => {
    console.log("useEffect triggered with editingBroker:", {
      isEditing: !!editingBroker,
      broker_name: editingBroker?.broker_name,
      description: editingBroker?.description,
      is_demo: editingBroker?.is_demo,
      credentials: editingBroker?.credentials
        ? {
            raw: editingBroker.credentials,
            apiKey: editingBroker.credentials.apiKey,
            identifier: editingBroker.credentials.identifier,
            password: editingBroker.credentials.password,
          }
        : null,
    });

    if (editingBroker) {
      console.log("Setting form data with credentials:", editingBroker.credentials);
      setFormData({
        broker_name: editingBroker.broker_name,
        description: editingBroker.description || "",
        is_demo: editingBroker.is_demo || false,
        credentials: {
          apiKey: editingBroker.credentials?.apiKey || "",
          identifier: editingBroker.credentials?.identifier || "",
          password: editingBroker.credentials?.password || "",
        },
      });
    } else {
      setFormData({
        broker_name: "",
        description: "",
        is_demo: false,
        credentials: {
          apiKey: "",
          identifier: "",
          password: "",
        },
      });
    }
  }, [editingBroker]);

  const handleClose = () => {
    console.log("Handling dialog close");
    onOpenChange(false);
    setShowApiKey(false);
    setShowPassword(false);
    if (!editingBroker) {
      console.log("Resetting form data on close");
      setFormData({
        broker_name: "",
        description: "",
        is_demo: false,
        credentials: {
          apiKey: "",
          identifier: "",
          password: "",
        },
      });
    }
  };

  const handleSubmit = async () => {
    console.log("Submitting form data:", {
      broker_name: formData.broker_name,
      description: formData.description,
      is_demo: formData.is_demo,
      credentials: {
        hasApiKey: !!formData.credentials.apiKey,
        hasIdentifier: !!formData.credentials.identifier,
        hasPassword: !!formData.credentials.password,
      },
    });
    await onSubmit(formData);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingBroker ? "Edit Broker Connection" : "Add Broker Connection"}</DialogTitle>
          <DialogDescription>
            {editingBroker ? "Manage your broker connection details. You can update the description or credentials." : "Connect your trading broker to enable automated trading."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="broker">Broker</Label>
            <Select
              disabled={!!editingBroker}
              value={formData.broker_name}
              onValueChange={(value) => {
                console.log("Broker selection changed to:", value);
                setFormData({
                  ...formData,
                  broker_name: value,
                  credentials: {
                    apiKey: "",
                    identifier: "",
                    password: "",
                  },
                });
              }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a broker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="capital.com">Capital.com</SelectItem>
                <SelectItem value="other" disabled>
                  More brokers coming soon
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g. Main Trading Account"
              value={formData.description}
              onChange={(e) => {
                console.log("Description changed");
                setFormData({
                  ...formData,
                  description: e.target.value,
                });
              }}
            />
          </div>

          {/* Demo Account Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_demo"
              checked={formData.is_demo}
              onCheckedChange={(checked) => {
                console.log("Demo account checkbox changed:", checked);
                setFormData({
                  ...formData,
                  is_demo: checked === true,
                  // Update description to help users identify the account type
                  description: checked === true && formData.description === "" ? "Demo Account" : formData.description,
                });
              }}
            />
            <Label htmlFor="is_demo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              This is a demo account
            </Label>
          </div>
          <div className="text-xs text-muted-foreground mb-2">Make sure to select the correct account type.</div>

          {formData.broker_name === "capital.com" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={formData.credentials.apiKey}
                    onChange={(e) => {
                      console.log("API Key changed");
                      setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, apiKey: e.target.value },
                      });
                    }}
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
                  onChange={(e) => {
                    console.log("Identifier changed");
                    setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, identifier: e.target.value },
                    });
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.credentials.password}
                    onChange={(e) => {
                      console.log("Password changed");
                      setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, password: e.target.value },
                      });
                    }}
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
          <Button onClick={handleSubmit}>{editingBroker ? "Save Changes" : "Add Broker"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
