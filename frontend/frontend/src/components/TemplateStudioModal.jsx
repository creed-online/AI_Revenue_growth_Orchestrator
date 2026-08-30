import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Sparkles, Send, CheckCheck, Phone, Video, MoreVertical, ExternalLink, ShieldCheck, Copy, Check } from "lucide-react";
import { testWhatsAppIntegration } from "../api/client";

const TEMPLATES = [
  {
    id: "replenishment_v1",
    title: "The Replenishment Nudge",
    badge: "Consumables",
    badgeColor: "bg-[#D97757]/15 text-[#D97757] border-[#D97757]/30",
    desc: "Gentle repurchase reminder timed to consumable usage cycle.",
    templates: {
      conversational_d2c: "Hey {{customer_name}}! 👋 We noticed you're likely running low on *{{product_name}}*.\n\nWe've set aside a fresh batch for you with an automatic *{{discount}}% OFF* VIP perk.\n\nTap below for 1-tap reorder & instant checkout ⚡:\n🔗 {{razorpay_link}}\n\n_Reply STOP to unsubscribe_",
      direct_urgency: "Hi {{customer_name}}, your supply of *{{product_name}}* is estimated to finish this week!\n\nLock in your replenishment today with *{{discount}}% OFF* before current stock runs out.\n\nReorder now:\n👉 {{razorpay_link}}",
      editorial_minimal: "{{customer_name}} — your *{{product_name}}* cycle is due for renewal.\n\nAs a valued member, enjoy *{{discount}}% complimentary savings* on today's restock:\n{{razorpay_link}}",
    },
  },
  {
    id: "vip_early_access_v1",
    title: "VIP Early Access Drop",
    badge: "Whales & High AOV",
    badgeColor: "bg-[#E5A93C]/15 text-[#E5A93C] border-[#E5A93C]/30",
    desc: "Private member allocation drop with personalized payment link.",
    templates: {
      conversational_d2c: "Hey {{customer_name}} 🌟 Because you're one of our top members at {{merchant_name}}, you get early access to our private drop for *{{product_name}}*!\n\nUse your exclusive *{{discount}}% OFF* member pass here:\n🔗 {{razorpay_link}}\n\nReserved for you for the next 24 hours only ✨",
      direct_urgency: "VIP ALERT 🔥 {{customer_name}}, private early access is live for *{{product_name}}*. Enjoy *{{discount}}% OFF* for the next 12 hours.\n\nClaim VIP pass:\n👉 {{razorpay_link}}",
      editorial_minimal: "{{customer_name}} — Private Access.\n\nYou have been selected for reserved allocation of *{{product_name}}* with *{{discount}}% privilege savings*:\n{{razorpay_link}}",
    },
  },
  {
    id: "flash_discount_v1",
    title: "Price-Sensitive Promo",
    badge: "Margin-Guarded",
    badgeColor: "bg-[#7C9A82]/15 text-[#7C9A82] border-[#7C9A82]/30",
    desc: "Targeted flash incentive guarded by 31.4% minimum margin floor.",
    templates: {
      conversational_d2c: "Hi {{customer_name}}! 🎁 Quick treat: We unlocked a flash *{{discount}}% OFF* on *{{product_name}}* just for today.\n\nNo coupons needed — your discount is already loaded in your personal link:\n⚡ {{razorpay_link}}\n\nGrab yours before midnight!",
      direct_urgency: "⚡ FLASH OFFER: {{customer_name}}, get *{{discount}}% OFF* on *{{product_name}}* today only.\n\nInstant Checkout:\n👉 {{razorpay_link}}",
      editorial_minimal: "Special curation for {{customer_name}}: Enjoy *{{discount}}% savings* on *{{product_name}}*.\n\nCheckout securely:\n{{razorpay_link}}",
    },
  },
  {
    id: "winback_voucher_v1",
    title: "Dormant Win-Back Voucher",
    badge: "Churn Prevention",
    badgeColor: "bg-[#D97070]/15 text-[#D97070] border-[#D97070]/30",
    desc: "Re-engage customers dormant for 60+ days with zero friction.",
    templates: {
      conversational_d2c: "Hey {{customer_name}}! It's been a while, and we really miss having you at {{merchant_name}} 💛\n\nWe'd love to welcome you back — here is a special *{{discount}}% OFF* voucher on *{{product_name}}*:\n🎁 {{razorpay_link}}\n\nHope to see you soon!",
      direct_urgency: "We miss you, {{customer_name}}! ⏳ Your *{{discount}}% welcome-back pass* for *{{product_name}}* expires in 48 hours.\n\nClaim now:\n👉 {{razorpay_link}}",
      editorial_minimal: "A warm welcome back to {{customer_name}}. Claim your *{{discount}}% voucher* on *{{product_name}}*:\n{{razorpay_link}}",
    },
  },
];

const TONES = [
  { id: "conversational_d2c", label: "Conversational D2C", icon: "💬" },
  { id: "direct_urgency", label: "Direct & Urgent", icon: "⚡" },
  { id: "editorial_minimal", label: "Editorial Minimal", icon: "✨" },
];

const VARIABLE_PILLS = [
  { tag: "{{customer_name}}", label: "Customer Name", sample: "Varun" },
  { tag: "{{product_name}}", label: "Product Name", sample: "Whey Protein Isolate" },
  { tag: "{{discount}}", label: "Discount %", sample: "15" },
  { tag: "{{razorpay_link}}", label: "Razorpay 1-Tap Link", sample: "https://rzp.io/l/demo-replenish" },
  { tag: "{{merchant_name}}", label: "Brand Name", sample: "RakshFit Nutrition" },
];

export default function TemplateStudioModal({ isOpen, onClose }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("replenishment_v1");
  const [selectedTone, setSelectedTone] = useState("conversational_d2c");
  const [testPhone, setTestPhone] = useState("+919876543210");
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const activeTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];
  const rawBody = activeTemplate.templates[selectedTone] || activeTemplate.templates.conversational_d2c;

  // Substitute variables for preview
  const renderedPreview = rawBody
    .replace(/{{customer_name}}/g, "Varun")
    .replace(/{{product_name}}/g, "Whey Protein Isolate (1kg)")
    .replace(/{{discount}}/g, "15")
    .replace(/{{razorpay_link}}/g, "https://rzp.io/l/demo-replenish-15")
    .replace(/{{merchant_name}}/g, "RakshFit Nutrition");

  async function handleSendTest() {
    setIsSending(true);
    setStatusMsg(null);
    try {
      const res = await testWhatsAppIntegration({
        phone: testPhone,
        templateKey: selectedTemplateId,
        tone: selectedTone,
      });

      if (res.success) {
        setStatusMsg({
          type: "success",
          text: `✔ Test template sent to ${res.to} (${res.mode === "live_meta" ? "Live Meta Cloud" : "Sandbox Simulation"})`,
        });
      } else {
        setStatusMsg({ type: "error", text: `Dispatch error: ${res.error}` });
      }
    } catch (err) {
      setStatusMsg({ type: "error", text: `Error: ${err.message}` });
    } finally {
      setIsSending(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(rawBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border border-[rgba(220,205,185,0.18)] bg-[#201E1A] shadow-[0_24px_70px_rgba(0,0,0,0.85)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(220,205,185,0.12)] bg-[#181714] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D97757]/15 border border-[#D97757]/30 text-[#D97757]">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-[#F5EFEB]">WhatsApp D2C Template Studio</h2>
                  <span className="rounded-full bg-[#7C9A82]/15 px-2 py-0.5 text-[10px] font-bold text-[#7C9A82] border border-[#7C9A82]/30">
                    4 Meta-Compliant Frameworks
                  </span>
                </div>
                <p className="text-xs text-[#9E978E]">Live interactive preview with dynamic Razorpay payment link tokens</p>
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

          {/* Main Studio Grid: Editor Left + iPhone Preview Right */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] max-h-[75vh] overflow-y-auto">
            {/* Left Column: Template Selection & Controls */}
            <div className="p-6 space-y-5 border-r border-[rgba(220,205,185,0.1)]">
              {/* Template Cards */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#9E978E] mb-2.5">
                  1. Select D2C Campaign Framework
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        selectedTemplateId === tpl.id
                          ? "border-[#D97757] bg-[#D97757]/10 shadow-[0_2px_12px_rgba(217,119,87,0.2)]"
                          : "border-[rgba(220,205,185,0.12)] bg-[#181714] hover:border-[#D97757]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-[#F5EFEB]">{tpl.title}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${tpl.badgeColor}`}>
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9E978E] line-clamp-2 leading-relaxed">{tpl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#9E978E] mb-2">
                  2. Select Conversational Tone
                </label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTone(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                        selectedTone === t.id
                          ? "border-[#D97757] bg-[#D97757] text-[#181714] font-bold"
                          : "border-[rgba(220,205,185,0.15)] bg-[#181714] text-[#DDD6CD] hover:border-[#D97757]/40"
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Variable Pills */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#9E978E]">
                    Dynamic Variable Injection
                  </label>
                  <span className="text-[10px] text-[#7C9A82]">Auto-populated per customer</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLE_PILLS.map((pill) => (
                    <span
                      key={pill.tag}
                      className="inline-flex items-center gap-1 rounded-md bg-[#272520] border border-[rgba(220,205,185,0.15)] px-2 py-1 text-[11px] font-mono text-[#E5A93C]"
                      title={`Example: ${pill.sample}`}
                    >
                      {pill.tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Copy / Export */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(220,205,185,0.2)] bg-[#181714] px-3 py-1.5 text-xs font-semibold text-[#DDD6CD] hover:border-[#D97757] hover:text-[#D97757] transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[#7C9A82]" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied to clipboard" : "Copy Raw Template"}</span>
                </button>
              </div>

              {/* Live Test Bar */}
              <div className="rounded-xl border border-[rgba(220,205,185,0.14)] bg-[#272520] p-4 space-y-2.5">
                <p className="text-xs font-bold text-[#F5EFEB]">⚡ Test This Copy On Your Phone</p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+91..."
                    className="flex-1 rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#181714] px-3 py-2 text-xs text-[#F5EFEB] focus:border-[#D97757] focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={isSending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-4 py-2 text-xs font-bold text-[#181714] transition hover:brightness-110 disabled:opacity-50 shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSending ? "Sending..." : "Send Test"}</span>
                  </button>
                </div>
                {statusMsg && (
                  <p className={`text-xs ${statusMsg.type === "success" ? "text-[#7C9A82]" : "text-[#D97070]"}`}>
                    {statusMsg.text}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Realistic iPhone Frame Mockup */}
            <div className="bg-[#181714] p-6 flex flex-col items-center justify-center">
              <p className="text-[11px] font-semibold text-[#9E978E] uppercase tracking-wider mb-3">
                Live WhatsApp Device Preview
              </p>

              {/* iPhone Frame */}
              <div className="w-full max-w-[320px] rounded-[38px] border-4 border-[#36322C] bg-[#0E1621] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.9)] overflow-hidden">
                {/* Dynamic Island */}
                <div className="mx-auto mb-2 h-4 w-24 rounded-full bg-black flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-[#1A1A1A] ml-auto mr-3" />
                </div>

                {/* WhatsApp Chat Header */}
                <div className="flex items-center justify-between border-b border-[#20272E] pb-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#D97757] to-[#E5A93C] flex items-center justify-center text-[10px] font-black text-[#181714]">
                      RF
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">RakshFit Nutrition</p>
                      <p className="text-[9px] text-[#7C9A82] flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-[#7C9A82]" /> Verified Business
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#9E978E]">
                    <Video className="h-3.5 w-3.5" />
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                </div>

                {/* Chat Message Bubble */}
                <div className="py-4 px-1 min-h-[260px] flex flex-col justify-end space-y-2">
                  <div className="self-center rounded-md bg-[#18222D] px-2 py-0.5 text-[9px] text-[#9E978E]">
                    TODAY
                  </div>

                  <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-[#005C4B] p-3 text-[11px] text-white shadow-md space-y-2">
                    <p className="whitespace-pre-wrap leading-relaxed text-[#E9EDEF]">
                      {renderedPreview}
                    </p>

                    {/* Razorpay Interactive Attachment Card */}
                    <div className="rounded-xl border border-white/10 bg-[#004A3C] p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-[#7C9A82] font-semibold">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> 1-Tap Razorpay Checkout
                        </span>
                        <span className="text-[#E5A93C]">15% OFF</span>
                      </div>
                      <p className="text-xs font-bold text-white">Whey Protein Isolate (1kg)</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-serif font-bold text-white">₹1,274.15</span>
                        <span className="text-[10px] text-[#9E978E] line-through">₹1,499.00</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 text-[9px] text-[#8696A0]">
                      <span>12:42 PM</span>
                      <CheckCheck className="h-3 w-3 text-[#53BDEB]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

