import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, MessageSquare, CreditCard, Send, CheckCircle2, AlertCircle, Shield, Key, Eye, EyeOff, Sparkles, RefreshCw } from "lucide-react";
import { fetchIntegrations, updateIntegrations, testSmtpIntegration, testWhatsAppIntegration } from "../api/client";

export default function IntegrationWizardModal({ isOpen, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState("whatsapp"); // "smtp" | "whatsapp" | "razorpay"
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [formData, setFormData] = useState({
    isSandboxMode: true,
    defaultTone: "conversational_d2c",
    selectedTemplate: "replenishment_v1",
    smtp: {
      provider: "smtp",
      host: "smtp.gmail.com",
      port: 587,
      user: "",
      password: "",
      senderEmail: "",
      senderName: "RakshFit Growth",
      isVerified: false,
    },
    whatsapp: {
      provider: "meta",
      phoneNumberId: "",
      wabaId: "",
      token: "",
      merchantTestPhone: "+91",
      isVerified: false,
    },
    razorpay: {
      keyId: "",
      keySecret: "",
      isVerified: false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadIntegrations();
    }
  }, [isOpen]);

  async function loadIntegrations() {
    setLoading(true);
    setTestResult(null);
    try {
      const data = await fetchIntegrations();
      if (data) {
        setFormData({
          isSandboxMode: data.isSandboxMode ?? true,
          defaultTone: data.defaultTone || "conversational_d2c",
          selectedTemplate: data.selectedTemplate || "replenishment_v1",
          smtp: {
            provider: data.smtp?.provider || "smtp",
            host: data.smtp?.host || "smtp.gmail.com",
            port: data.smtp?.port || 587,
            user: data.smtp?.user || "",
            password: "",
            senderEmail: data.smtp?.senderEmail || "",
            senderName: data.smtp?.senderName || "RakshFit Growth",
            isVerified: data.smtp?.isVerified || false,
          },
          whatsapp: {
            provider: data.whatsapp?.provider || "meta",
            phoneNumberId: data.whatsapp?.phoneNumberId || "",
            wabaId: data.whatsapp?.wabaId || "",
            token: data.whatsapp?.tokenMasked || "",
            merchantTestPhone: data.whatsapp?.merchantTestPhone || "+91",
            isVerified: data.whatsapp?.isVerified || false,
          },
          razorpay: {
            keyId: data.razorpay?.keyId || "",
            keySecret: data.razorpay?.secretMasked || "",
            isVerified: data.razorpay?.isVerified || false,
          },
        });
      }
    } catch (err) {
      console.warn("Failed to load integrations:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setTestResult(null);
    try {
      await updateIntegrations({
        isSandboxMode: formData.isSandboxMode,
        defaultTone: formData.defaultTone,
        selectedTemplate: formData.selectedTemplate,
        smtp: {
          ...formData.smtp,
          password: formData.smtp.password || undefined,
        },
        whatsapp: {
          ...formData.whatsapp,
          token: formData.whatsapp.token || undefined,
        },
        razorpay: {
          ...formData.razorpay,
          keySecret: formData.razorpay.keySecret || undefined,
        },
      });

      setTestResult({
        success: true,
        message: "✔ Settings encrypted and saved successfully!",
      });

      if (onUpdated) onUpdated();
    } catch (err) {
      setTestResult({
        success: false,
        message: `Save failed: ${err.message}`,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await testSmtpIntegration({
        host: formData.smtp.host,
        port: formData.smtp.port,
        user: formData.smtp.user,
        password: formData.smtp.password || undefined,
        senderEmail: formData.smtp.senderEmail,
        senderName: formData.smtp.senderName,
        targetEmail: formData.smtp.user || formData.smtp.senderEmail,
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: `✔ SMTP Test email sent successfully! (ID: ${res.messageId})`,
        });
        setFormData((prev) => ({
          ...prev,
          smtp: { ...prev.smtp, isVerified: true },
        }));
      } else {
        setTestResult({
          success: false,
          message: `SMTP Test failed: ${res.error}`,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `SMTP Test error: ${err.message}`,
      });
    } finally {
      setTestSending(false);
    }
  }

  async function handleTestWhatsApp() {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await testWhatsAppIntegration({
        phone: formData.whatsapp.merchantTestPhone,
        templateKey: formData.selectedTemplate,
        tone: formData.defaultTone,
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: `✔ Live WhatsApp nudge dispatched to ${res.to} (${res.mode === "live_meta" ? "Live Meta API" : "Sandbox Simulation"})`,
          preview: res.renderedBody,
        });
        setFormData((prev) => ({
          ...prev,
          whatsapp: { ...prev.whatsapp, isVerified: true },
        }));
      } else {
        setTestResult({
          success: false,
          message: `WhatsApp test failed: ${res.error}`,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `WhatsApp test error: ${err.message}`,
      });
    } finally {
      setTestSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-[rgba(220,205,185,0.18)] bg-[#201E1A] shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-[rgba(220,205,185,0.12)] bg-[#181714] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D97757]/15 border border-[#D97757]/30 text-[#D97757]">
                <Key className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-[#F5EFEB]">Merchant Integration Gateway</h2>
                <p className="text-xs text-[#9E978E]">Configure BYO SMTP, WhatsApp Business Cloud API & Razorpay Keys</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#9E978E] hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sandbox Switch Banner */}
          <div className="flex items-center justify-between border-b border-[rgba(220,205,185,0.08)] bg-[#272520] px-6 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#E5A93C]" />
              <span className="text-[#DDD6CD]">
                {formData.isSandboxMode ? (
                  <strong className="text-[#E5A93C]">Sandbox Simulation Mode (Zero live messaging cost)</strong>
                ) : (
                  <strong className="text-[#7C9A82]">Live Dispatch Mode (Real WhatsApp & SMTP APIs)</strong>
                )}
              </span>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!formData.isSandboxMode}
                onChange={(e) => setFormData({ ...formData, isSandboxMode: !e.target.checked })}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-[#181714] border border-[rgba(220,205,185,0.2)] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-[#9E978E] after:transition-all after:content-[''] peer-checked:bg-[#7C9A82] peer-checked:after:translate-x-full peer-checked:after:bg-white"></div>
              <span className="ml-2 text-[11px] font-semibold text-[#9E978E]">Live Mode</span>
            </label>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-[rgba(220,205,185,0.1)] bg-[#1D1B17] px-6">
            <button
              type="button"
              onClick={() => setActiveTab("whatsapp")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                activeTab === "whatsapp"
                  ? "border-[#D97757] text-[#D97757]"
                  : "border-transparent text-[#9E978E] hover:text-[#DDD6CD]"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp Business API</span>
              {formData.whatsapp.isVerified && <span className="h-1.5 w-1.5 rounded-full bg-[#7C9A82]" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("smtp")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                activeTab === "smtp"
                  ? "border-[#D97757] text-[#D97757]"
                  : "border-transparent text-[#9E978E] hover:text-[#DDD6CD]"
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>Custom SMTP Email</span>
              {formData.smtp.isVerified && <span className="h-1.5 w-1.5 rounded-full bg-[#7C9A82]" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("razorpay")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                activeTab === "razorpay"
                  ? "border-[#D97757] text-[#D97757]"
                  : "border-transparent text-[#9E978E] hover:text-[#DDD6CD]"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Razorpay Live Keys</span>
              {formData.razorpay.isVerified && <span className="h-1.5 w-1.5 rounded-full bg-[#7C9A82]" />}
            </button>
          </div>

          {/* Modal Body */}
          <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
            {/* Feedback Alert */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-3.5 text-xs ${
                  testResult.success
                    ? "border-[#7C9A82]/30 bg-[#7C9A82]/10 text-[#7C9A82]"
                    : "border-[#D97070]/30 bg-[#D97070]/10 text-[#D97070]"
                }`}
              >
                <p className="font-semibold">{testResult.message}</p>
                {testResult.preview && (
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-[#181714] p-2.5 font-mono text-[11px] text-[#DDD6CD]">
                    {testResult.preview}
                  </pre>
                )}
              </motion.div>
            )}

            {/* TAB 1: WHATSAPP */}
            {activeTab === "whatsapp" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#D97757]/20 bg-[#D97757]/8 p-3.5 text-xs text-[#DDD6CD]">
                  <p className="font-semibold text-[#D97757] mb-1">💬 Meta Cloud API & Twilio Ready</p>
                  <p className="text-[11px] leading-relaxed text-[#9E978E]">
                    Connect your verified Meta WhatsApp Business Account (WABA) or test in simulation sandbox. All credentials are encrypted via AES-256-GCM.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#9E978E] mb-1">Phone Number ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 109876543210987"
                      value={formData.whatsapp.phoneNumberId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          whatsapp: { ...formData.whatsapp, phoneNumberId: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#9E978E] mb-1">WABA Account ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 239847192837465"
                      value={formData.whatsapp.wabaId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          whatsapp: { ...formData.whatsapp, wabaId: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9E978E] mb-1">Permanent Meta Access Token</label>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      placeholder="EAAG... (Leave empty to keep existing encrypted token)"
                      value={formData.whatsapp.token}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          whatsapp: { ...formData.whatsapp, token: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-2 text-[#9E978E] hover:text-white"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* 1-Click Test to My Phone */}
                <div className="rounded-xl border border-[rgba(220,205,185,0.14)] bg-[#272520] p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F5EFEB]">⚡ 1-Click "Send Test to My Phone"</span>
                    <span className="text-[10px] text-[#9E978E]">Instant D2C Template Check</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="+919876543210"
                      value={formData.whatsapp.merchantTestPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          whatsapp: { ...formData.whatsapp, merchantTestPhone: e.target.value },
                        })
                      }
                      className="flex-1 rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleTestWhatsApp}
                      disabled={testSending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-4 py-2 text-xs font-bold text-[#181714] transition hover:brightness-110 disabled:opacity-50 shrink-0"
                    >
                      {testSending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      <span>Send Live Test</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SMTP */}
            {activeTab === "smtp" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#7C9A82]/20 bg-[#7C9A82]/8 p-3.5 text-xs text-[#DDD6CD]">
                  <p className="font-semibold text-[#7C9A82] mb-1">📧 Dedicated Merchant SMTP</p>
                  <p className="text-[11px] leading-relaxed text-[#9E978E]">
                    Deliver campaign emails directly from your own domain (Gmail, SendGrid, Amazon SES, or custom SMTP).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#9E978E] mb-1">SMTP Host</label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={formData.smtp.host}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          smtp: { ...formData.smtp, host: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#9E978E] mb-1">Port</label>
                    <input
                      type="number"
                      placeholder="587"
                      value={formData.smtp.port}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          smtp: { ...formData.smtp, port: Number(e.target.value) },
                        })
                      }
                      className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#9E978E] mb-1">SMTP Username / Email</label>
                    <input
                      type="text"
                      placeholder="merchant@domain.com"
                      value={formData.smtp.user}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          smtp: { ...formData.smtp, user: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#9E978E] mb-1">SMTP Password / App Key</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={formData.smtp.password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            smtp: { ...formData.smtp, password: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2 text-[#9E978E] hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#9E978E] mb-1">Sender Email</label>
                    <input
                      type="email"
                      placeholder="orders@rakshfit.com"
                      value={formData.smtp.senderEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          smtp: { ...formData.smtp, senderEmail: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#9E978E] mb-1">Sender Name</label>
                    <input
                      type="text"
                      placeholder="RakshFit Nutrition"
                      value={formData.smtp.senderName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          smtp: { ...formData.smtp, senderName: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testSending}
                  className="inline-flex items-center gap-2 rounded-xl border border-[rgba(220,205,185,0.2)] bg-[#272520] px-4 py-2 text-xs font-semibold text-[#DDD6CD] hover:border-[#7C9A82] hover:text-[#7C9A82] transition-colors"
                >
                  {testSending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>Verify & Send Test Email</span>
                </button>
              </div>
            )}

            {/* TAB 3: RAZORPAY */}
            {activeTab === "razorpay" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#E5A93C]/20 bg-[#E5A93C]/8 p-3.5 text-xs text-[#DDD6CD]">
                  <p className="font-semibold text-[#E5A93C] mb-1">💳 Razorpay Live / Test Gateway</p>
                  <p className="text-[11px] leading-relaxed text-[#9E978E]">
                    Connect your Razorpay API Key ID and Secret to generate instant checkout payment links inside WhatsApp nudges.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9E978E] mb-1">Razorpay Key ID</label>
                  <input
                    type="text"
                    placeholder="rzp_live_..."
                    value={formData.razorpay.keyId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        razorpay: { ...formData.razorpay, keyId: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9E978E] mb-1">Razorpay Key Secret</label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={formData.razorpay.keySecret}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          razorpay: { ...formData.razorpay, keySecret: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-2 text-[#9E978E] hover:text-white"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-[rgba(220,205,185,0.12)] bg-[#181714] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[#9E978E] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-5 py-2 text-xs font-bold text-[#181714] transition hover:brightness-110 shadow-[0_2px_12px_rgba(217,119,87,0.3)] disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Save & Encrypt Gateway</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

