import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserSettings } from "@/lib/api/settings";

interface PreferencesSettingsProps {
  settings: UserSettings;
  onUpdateSettings: (updates: { is_active?: boolean }) => Promise<void>;
}

export function PreferencesSettings({ settings, onUpdateSettings }: PreferencesSettingsProps) {
  return (
    <>
      <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Trading Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-base font-medium text-slate-900 dark:text-white">Account Active</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Enable or disable your trading account</p>
              </div>
              <Switch checked={settings.is_active} onCheckedChange={(checked) => onUpdateSettings({ is_active: checked })} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 mt-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-base font-medium text-slate-900 dark:text-white">Trade Notifications</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Receive notifications for trade executions</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-base font-medium text-slate-900 dark:text-white">Signal Alerts</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Get notified when new trading signals are generated</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-base font-medium text-slate-900 dark:text-white">Price Alerts</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Receive alerts for significant price movements</p>
              </div>
              <Switch />
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
