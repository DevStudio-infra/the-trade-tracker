import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserSettings } from "@/lib/api/settings";

interface AccountSettingsProps {
  settings: UserSettings;
  onUpdateSettings: (updates: { name?: string }) => Promise<void>;
}

export function AccountSettings({ settings, onUpdateSettings }: AccountSettingsProps) {
  return (
    <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account Information</h3>
        <div className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label className="text-sm text-slate-600 dark:text-slate-400">Email</Label>
            <Input value={settings.email} disabled className="bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 text-slate-900 dark:text-slate-300" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Your email address is managed through your authentication provider.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-slate-600 dark:text-slate-400">Full Name</Label>
            <Input
              value={settings.name || ""}
              onChange={(e) => onUpdateSettings({ name: e.target.value })}
              placeholder="Enter your full name"
              className="bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">Your name will be used for communications and trading reports.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
