import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchCampaignNotifications,
  simulateOpenTracking,
  simulateClickTracking,
  simulatePurchase,
} from "../api/client";
import { fireCelebrationConfetti } from "../utils/confetti";
import {
  X,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  CheckCheck,
  Send,
  Eye,
  MousePointer,
  CreditCard,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function CampaignEmailSimulatorModal({
  campaignId,
  campaignName,
  offerValue = 10,
  isOpen,
  onClose,
  onOrderCreated,
}) {
  const [activeChannel, setActiveChannel] = useState("whatsapp"); // "whatsapp" | "email"
  const [notifications, setNotifications] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  useEffect(() => {
    if (isOpen && campaignId) {
      loadNotifications();
    }
  }, [isOpen, campaignId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetchCampaignNotifications(campaignId);
      const items = res?.notifications || [];
      setNotifications(items);
      if (items.length > 0) {
        setSelectedRecipient(items[0]);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (text, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setActivityLogs((prev) => [{ time, text, type }, ...prev]);
  };

  const handleSimulateOpen = async () => {
    if (!selectedRecipient?.trackingToken) return;
    try {
      setActionLoading(true);
      await simulateOpenTracking(selectedRecipient.trackingToken);
      setStatusMessage({ type: "success", text: `✔ Open / Read receipt recorded for ${selectedRecipient.customerName}!` });
      addLog(`👁️ ${selectedRecipient.customerName} opened notification`, "success");

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === selectedRecipient.id
            ? { ...n, openedAt: new Date().toISOString(), openCount: (n.openCount || 0) + 1 }
            : n
        )
      );
      setSelectedRecipient((prev) => ({
        ...prev,
        openedAt: new Date().toISOString(),
        openCount: (prev.openCount || 0) + 1,
      }));
    } catch (err) {
      setStatusMessage({ type: "error", text: `Failed to record open: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateClick = async () => {
    if (!selectedRecipient?.trackingToken) return;
    try {
      setActionLoading(true);
      await simulateClickTracking(selectedRecipient.trackingToken);
      setStatusMessage({ type: "success", text: `✔ Razorpay 1-Tap CTA click recorded for ${selectedRecipient.customerName}!` });
      addLog(`🖱️ ${selectedRecipient.customerName} clicked 1-Tap checkout link`, "info");

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === selectedRecipient.id
            ? {
                ...n,
                clickedAt: new Date().toISOString(),
                openedAt: n.openedAt || new Date().toISOString(),
                clickCount: (n.clickCount || 0) + 1,
              }
            : n
        )
      );
      setSelectedRecipient((prev) => ({
        ...prev,
        clickedAt: new Date().toISOString(),
        openedAt: prev.openedAt || new Date().toISOString(),
        clickCount: (prev.clickCount || 0) + 1,
      }));
    } catch (err) {
      setStatusMessage({ type: "error", text: `Failed to record click: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateRazorpayPurchase = async () => {
    if (!selectedRecipient) return;
    try {
      setActionLoading(true);
      const res = await simulatePurchase({
        campaignId,
        customerId: selectedRecipient.customerId,
        trackingToken: selectedRecipient.trackingToken,
        quantity: 1,
        unitPrice: 2499.0,
      });

      fireCelebrationConfetti();
      setStatusMessage({
        type: "success",
        text: `🎉 Order #${res.orderId} (₹${res.totalPrice.toFixed(2)}) attributed & executed via Razorpay!`,
      });
      addLog(`💳 ${selectedRecipient.customerName} paid ₹${res.totalPrice.toFixed(2)} on Razorpay Test Gateway (Order #${res.orderId})`, "success");

      if (onOrderCreated) {
        onOrderCreated(res);
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: `Payment simulation failed: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="bg-[#201E1A] border border-[rgba(220,205,185,0.18)] rounded-2xl w-full max-w-5xl overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(220,205,185,0.12)] bg-[#181714]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D97757]/15 border border-[#D97757]/30 flex items-center justify-center text-[#D97757] font-bold">
              <Smartphone className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#F5EFEB]">
                  Campaign Dispatch & Razorpay Attribution Simulator
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7C9A82]/15 text-[#7C9A82] border border-[#7C9A82]/30 font-semibold">
                  {notifications.length} Audiences Dispatched
                </span>
              </div>
              <p className="text-xs text-[#9E978E]">
                Campaign #{campaignId} &bull; {campaignName} &bull; {offerValue}% Discount Offer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-[rgba(220,205,185,0.12)] bg-[#272520] p-0.5">
              <button
                type="button"
                onClick={() => setActiveChannel("whatsapp")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  activeChannel === "whatsapp" ? "bg-[#D97757] text-[#181714] font-bold" : "text-[#9E978E]"
                }`}
              >
                <MessageSquare className="h-3 w-3" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveChannel("email")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  activeChannel === "email" ? "bg-[#D97757] text-[#181714] font-bold" : "text-[#9E978E]"
                }`}
              >
                <Mail className="h-3 w-3" />
                <span>Email</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#9E978E] hover:text-white hover:bg-white/10 transition ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Split Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 flex-1 overflow-hidden">
          {/* Left Column: Recipient Selector & Action Controls */}
          <div className="md:col-span-5 border-r border-[rgba(220,205,185,0.1)] bg-[#1D1B17] p-5 flex flex-col gap-4 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9E978E]">
                  Target Audience ({notifications.length})
                </span>
                <span className="text-[10px] text-[#7C9A82] bg-[#7C9A82]/10 px-2 py-0.5 rounded border border-[#7C9A82]/20 font-mono">
                  Attribution Tokens Armed
                </span>
              </div>

              {loading ? (
                <div className="text-xs text-[#9E978E] py-6 text-center">Loading recipient dispatches...</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {notifications.map((n) => {
                    const isSelected = selectedRecipient?.id === n.id;
                    const isOpened = !!n.openedAt;
                    const isClicked = !!n.clickedAt;

                    return (
                      <button
                        key={n.id}
                        onClick={() => setSelectedRecipient(n)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition border flex items-center justify-between ${
                          isSelected
                            ? "bg-[#D97757]/15 border-[#D97757] text-[#F5EFEB]"
                            : "bg-[#201E1A] border-[rgba(220,205,185,0.1)] text-[#DDD6CD] hover:border-[#D97757]/40"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold text-white truncate">{n.customerName}</div>
                          <div className="text-[11px] text-[#9E978E] truncate">{n.customerEmail || "+919876543210"}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isOpened && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#7C9A82]/20 text-[#7C9A82] border border-[#7C9A82]/30 font-bold">
                              Read
                            </span>
                          )}
                          {isClicked && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E5A93C]/20 text-[#E5A93C] border border-[#E5A93C]/30 font-bold">
                              Clicked
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Interactive Lab Triggers */}
            <div className="border-t border-[rgba(220,205,185,0.1)] pt-3 flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9E978E]">
                1-Click Funnel Attribution Triggers
              </span>

              <button
                disabled={actionLoading || !selectedRecipient}
                onClick={handleSimulateOpen}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#272520] hover:bg-[#36322C] text-[#DDD6CD] text-xs font-semibold transition border border-[rgba(220,205,185,0.15)] disabled:opacity-50"
              >
                <Eye className="h-3.5 w-3.5 text-[#7C9A82]" />
                <span>Simulate Open / Read Receipt</span>
              </button>

              <button
                disabled={actionLoading || !selectedRecipient}
                onClick={handleSimulateClick}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#272520] hover:bg-[#36322C] text-[#DDD6CD] text-xs font-semibold transition border border-[rgba(220,205,185,0.15)] disabled:opacity-50"
              >
                <MousePointer className="h-3.5 w-3.5 text-[#E5A93C]" />
                <span>Simulate 1-Tap Razorpay Link Click</span>
              </button>

              <button
                disabled={actionLoading || !selectedRecipient}
                onClick={handleSimulateRazorpayPurchase}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] hover:brightness-110 text-[#181714] text-xs font-bold transition shadow-lg shadow-[#D97757]/25 disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" />
                <span>Approve Order on Razorpay Test Gateway</span>
              </button>
            </div>

            {/* Event Log */}
            <div className="border-t border-[rgba(220,205,185,0.1)] pt-3 flex-1 flex flex-col min-h-[90px]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9E978E] mb-1">
                Real-Time Attribution Stream
              </span>
              <div className="flex-1 overflow-y-auto space-y-1 max-h-28 text-[10px] font-mono">
                {activityLogs.length === 0 ? (
                  <div className="text-[#9E978E] italic py-2">Click triggers above to simulate live customer funnel events.</div>
                ) : (
                  activityLogs.map((log, i) => (
                    <div key={i} className="text-[#DDD6CD] bg-[#181714] p-1.5 rounded border border-[rgba(220,205,185,0.08)]">
                      <span className="text-[#9E978E] mr-1.5">[{log.time}]</span>
                      {log.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Device Frame Preview */}
          <div className="md:col-span-7 p-6 flex flex-col gap-4 overflow-y-auto bg-[#181714] items-center justify-center">
            {statusMessage && (
              <div
                className={`w-full max-w-sm p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
                  statusMessage.type === "success"
                    ? "bg-[#7C9A82]/15 border-[#7C9A82]/40 text-[#7C9A82]"
                    : "bg-[#D97070]/15 border-[#D97070]/40 text-[#D97070]"
                }`}
              >
                <span>{statusMessage.text}</span>
                <button onClick={() => setStatusMessage(null)} className="text-[#9E978E] hover:text-white">✕</button>
              </div>
            )}

            {/* WhatsApp Device Mockup */}
            {activeChannel === "whatsapp" ? (
              <div className="w-full max-w-[320px] rounded-[38px] border-4 border-[#36322C] bg-[#0E1621] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="mx-auto mb-2 h-4 w-24 rounded-full bg-black flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#1A1A1A] ml-auto mr-3" />
                </div>

                <div className="flex items-center justify-between border-b border-[#20272E] pb-2 px-1 text-white">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#D97757] to-[#E5A93C] flex items-center justify-center text-[9px] font-black text-[#181714]">
                      RF
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">RakshFit Nutrition</p>
                      <p className="text-[9px] text-[#7C9A82]">✔ Verified Business</p>
                    </div>
                  </div>
                </div>

                <div className="py-4 px-1 space-y-2">
                  <div className="rounded-2xl rounded-tl-sm bg-[#005C4B] p-3 text-[11px] text-white shadow space-y-2">
                    <p className="whitespace-pre-wrap leading-relaxed text-[#E9EDEF]">
                      {selectedRecipient?.body || `Hey ${selectedRecipient?.customerName || "Valued Customer"}! 👋 We've unlocked an exclusive ${offerValue}% OFF replenishment perk for you.`}
                    </p>

                    <div className="rounded-xl border border-white/10 bg-[#004A3C] p-2 text-[10px] space-y-1">
                      <div className="flex justify-between text-[#7C9A82] font-semibold">
                        <span>🛡️ 1-Tap Razorpay Checkout</span>
                        <span className="text-[#E5A93C]">{offerValue}% OFF</span>
                      </div>
                      <p className="font-bold text-white">Consumable Replenishment Package</p>
                    </div>

                    <div className="flex items-center justify-end gap-1 text-[9px] text-[#8696A0]">
                      <span>12:45 PM</span>
                      <CheckCheck className="h-3 w-3 text-[#53BDEB]" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Email Preview */
              <div className="w-full max-w-md border border-[rgba(220,205,185,0.15)] rounded-2xl bg-[#201E1A] p-5 shadow-xl space-y-4">
                <div className="border-b border-[rgba(220,205,185,0.1)] pb-3">
                  <span className="text-[10px] font-bold text-[#D97757] uppercase tracking-wider">
                    RakshFit Nutrition &bull; AI Dispatcher
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1">
                    {selectedRecipient?.subject || `Exclusive ${offerValue}% OFF — ${campaignName}`}
                  </h3>
                  <p className="text-xs text-[#9E978E] mt-0.5">
                    To: {selectedRecipient?.customerName} &lt;{selectedRecipient?.customerEmail}&gt;
                  </p>
                </div>

                <p className="text-xs text-[#DDD6CD] leading-relaxed">
                  {selectedRecipient?.body || `We noticed your supply is running low. Enjoy ${offerValue}% off today's restock:`}
                </p>

                <div className="p-3 rounded-xl bg-[#D97757]/10 border border-dashed border-[#D97757]/30 text-center">
                  <span className="font-mono text-sm font-bold text-white">SAVE{offerValue}</span>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleSimulateRazorpayPurchase}
                    className="rounded-xl bg-gradient-to-r from-[#D97757] to-[#C96442] px-6 py-2.5 text-xs font-bold text-[#181714]"
                  >
                    {selectedRecipient?.cta || `Claim ${offerValue}% OFF →`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[rgba(220,205,185,0.12)] bg-[#181714] flex items-center justify-between text-xs text-[#9E978E]">
          <div>
            💡 Tip: Clicking <strong>"Approve Order on Razorpay Test Gateway"</strong> creates a real attributed Order in PostgreSQL.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#272520] hover:bg-[#36322C] text-[#DDD6CD] font-medium transition"
          >
            Close Lab
          </button>
        </div>
      </motion.div>
    </div>
  );
}
