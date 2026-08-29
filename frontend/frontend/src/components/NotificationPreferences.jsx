import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Mail, Smartphone, Globe, Moon, Sun, Save, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "../api/client";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, "0")}:00`,
}));

function NotificationPreferences() {
  const [prefs, setPrefs] = useState({
    email: true,
    sms: false,
    whatsapp: false,
    frequency: "weekly",
    quietHoursStart: 22,
    quietHoursEnd: 8,
  });
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const fetchPrefs = async () => {
    try {
      const res = await api.get("/customers/notification-prefs");
      setCustomers(res.data.customers || []);
    } catch (err) {
      setError("Failed to load preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalChange = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const savePrefs = async () => {
    setSaving(true);
    setError("");
    try {
      await api.put("/customers/notification-prefs", { prefs });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleCustomerSave = async (customerId, prefs) => {
    try {
      await api.put(`/customers/notification-prefs/${customerId}`, { prefs });
    } catch (err) {
      console.error("Failed to save customer prefs:", err);
    }
  };

  const saveCustomerPref = (customerId, prefs) => {
    handleCustomerSave(customerId, prefs);
  };

  useEffect(() => {
    fetchPrefs();
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel rounded-2xl p-8 text-center"
      >
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-mint" />
        <p className="mt-4 text-ink-muted">Loading preferences...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Notification Preferences</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Configure how and when your customers receive replenishment reminders
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-xs font-semibold text-mint"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </motion.span>
          )}
          <button
            onClick={savePrefs}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-mint to-mint-deep px-4 py-2.5 text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-rose-signal/30 bg-rose-signal/10 p-4 text-sm text-rose-signal"
        >
          {error}
        </motion.div>
      )}

      {/* Global Preferences */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="panel rounded-2xl p-6"
      >
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white mb-6">
          <Bell className="h-5 w-5 text-mint" />
          Global Settings
        </h2>
        <p className="text-sm text-ink-muted mb-6">Applied to all customers unless individually overridden</p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Email Toggle */}
          <label className="flex items-center gap-3 p-4 rounded-xl border border-ink-border bg-ink-elevated/50 cursor-pointer transition hover:border-mint/30">
            <input
              type="checkbox"
              checked={prefs.email}
              onChange={(e) => handleGlobalChange("email", e.target.checked)}
              className="w-5 h-5 accent-mint rounded border-ink-border"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-mint" />
                <span className="font-medium text-white">Email Notifications</span>
              </div>
              <p className="text-xs text-ink-muted mt-1">Send replenishment reminders via email</p>
            </div>
          </label>

          {/* SMS Toggle */}
          <label className="flex items-center gap-3 p-4 rounded-xl border border-ink-border bg-ink-elevated/50 cursor-pointer transition hover:border-mint/30">
            <input
              type="checkbox"
              checked={prefs.sms}
              onChange={(e) => handleGlobalChange("sms", e.target.checked)}
              className="w-5 h-5 accent-mint rounded border-ink-border"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-sky" />
                <span className="font-medium text-white">SMS Notifications</span>
              </div>
              <p className="text-xs text-ink-muted mt-1">Send via SMS (requires Twilio setup)</p>
            </div>
          </label>

          {/* WhatsApp Toggle */}
          <label className="flex items-center gap-3 p-4 rounded-xl border border-ink-border bg-ink-elevated/50 cursor-pointer transition hover:border-mint/30">
            <input
              type="checkbox"
              checked={prefs.whatsapp}
              onChange={(e) => handleGlobalChange("whatsapp", e.target.checked)}
              className="w-5 h-5 accent-mint rounded border-ink-border"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-500" />
                <span className="font-medium text-white">WhatsApp Notifications</span>
              </div>
              <p className="text-xs text-ink-muted mt-1">Send via WhatsApp (requires Business API)</p>
            </div>
          </label>

          {/* Frequency Select */}
          <label className="flex flex-col gap-2 p-4 rounded-xl border border-ink-border bg-ink-elevated/50">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-signal" />
              <span className="font-medium text-white">Notification Frequency</span>
            </div>
            <select
              value={prefs.frequency}
              onChange={(e) => handleGlobalChange("frequency", e.target.value)}
              className="w-full rounded-xl border border-ink-border bg-ink-elevated px-4 py-3 text-white outline-none focus:border-mint/40"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Quiet Hours */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 p-4 rounded-xl border border-ink-border bg-ink-elevated/50">
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-amber-signal" />
              <span className="font-medium text-white">Quiet Hours Start</span>
            </div>
            <select
              value={prefs.quietHoursStart}
              onChange={(e) => handleGlobalChange("quietHoursStart", parseInt(e.target.value, 10))}
              className="w-full rounded-xl border border-ink-border bg-ink-elevated px-4 py-3 text-white outline-none focus:border-mint/40"
            >
              {HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 p-4 rounded-xl border border-ink-border bg-ink-elevated/50">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-signal" />
              <span className="font-medium text-white">Quiet Hours End</span>
            </div>
            <select
              value={prefs.quietHoursEnd}
              onChange={(e) => handleGlobalChange("quietHoursEnd", parseInt(e.target.value, 10))}
              className="w-full rounded-xl border border-ink-border bg-ink-elevated px-4 py-3 text-white outline-none focus:border-mint/40"
            >
              {HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </motion.section>

      {/* Customer Override Section */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="panel rounded-2xl p-6"
      >
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white mb-6">
          <Bell className="h-5 w-5 text-amber-signal" />
          Customer Overrides
        </h2>
        <p className="text-sm text-ink-muted mb-6">Override global settings for specific customers</p>

        {customers.length === 0 ? (
          <div className="text-center py-8 text-ink-muted">
            <Bell className="mx-auto mb-3 h-10 w-10 text-ink-muted" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-border text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">SMS</th>
                  <th className="pb-3 pr-4">WhatsApp</th>
                  <th className="pb-3 pr-4">Frequency</th>
                  <th className="pb-3 pr-4">Quiet Hours</th>
                  <th className="pb-3 pr-4">Notifications Sent</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const cp = customer.notificationPrefs || {
                    email: true,
                    sms: false,
                    whatsapp: false,
                    frequency: "weekly",
                    quietHoursStart: 22,
                    quietHoursEnd: 8,
                  };
                  return (
                    <tr key={customer.id} className="border-b border-ink-border/50 hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-4 font-medium text-white">{customer.name}</td>
                      <td className="py-3 pr-4 text-ink-muted">{customer.email || "—"}</td>
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={cp.email}
                          onChange={(e) => saveCustomerPref(customer.id, { ...cp, email: e.target.checked })}
                          className="w-4 h-4 accent-mint rounded border-ink-border"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={cp.sms}
                          onChange={(e) => saveCustomerPref(customer.id, { ...cp, sms: e.target.checked })}
                          className="w-4 h-4 accent-mint rounded border-ink-border"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={cp.whatsapp}
                          onChange={(e) => saveCustomerPref(customer.id, { ...cp, whatsapp: e.target.checked })}
                          className="w-4 h-4 accent-mint rounded border-ink-border"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={cp.frequency}
                          onChange={(e) => saveCustomerPref(customer.id, { ...cp, frequency: e.target.value })}
                          className="rounded-xl border border-ink-border bg-ink-elevated px-3 py-1.5 text-sm text-white outline-none focus:border-mint/40"
                        >
                          {FREQUENCY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4 text-ink-muted">
                        {cp.quietHoursStart}:00 - {cp.quietHoursEnd}:00
                      </td>
                      <td className="py-3 pr-4 text-ink-muted font-mono">{customer.notificationCount || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}

export default NotificationPreferences;