import React, { useState, useEffect } from "react";
import {
  fetchCampaignNotifications,
  simulateOpenTracking,
  simulateClickTracking,
  simulatePurchase,
} from "../api/client";

import { fireCelebrationConfetti } from "../utils/confetti";

export default function CampaignEmailSimulatorModal({
  campaignId,
  campaignName,
  offerValue = 10,
  isOpen,
  onClose,
  onOrderCreated,
}) {
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
      setStatusMessage({ type: "success", text: `✔ Open pixel recorded for ${selectedRecipient.customerName}!` });
      addLog(`👁️ ${selectedRecipient.customerName} opened email`, "success");
      
      // Update local recipient state
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
      const res = await simulateClickTracking(selectedRecipient.trackingToken);
      setStatusMessage({ type: "success", text: `✔ CTA click recorded for ${selectedRecipient.customerName}!` });
      addLog(`🖱️ ${selectedRecipient.customerName} clicked CTA link → Redirected to Storefront`, "info");

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
        text: `🎉 Order #${res.orderId} (₹${res.totalPrice.toFixed(2)}) approved on Razorpay Test Gateway & attributed!`,
      });
      addLog(`💳 ${selectedRecipient.customerName} paid ₹${res.totalPrice.toFixed(2)} on Razorpay Test Gateway (Order #${res.orderId} created)`, "success");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0b121e] border border-slate-700/80 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold">
              ✉️
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Live Campaign Email Dispatch & Attribution Lab
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  {notifications.length} Recipient Emails Dispatched
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Campaign #{campaignId} &bull; {campaignName} &bull; {offerValue}% Discount Applied
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 flex-1 overflow-hidden">
          
          {/* Left Column: Recipient Selector & Activity */}
          <div className="md:col-span-4 border-r border-slate-800 bg-slate-950/40 p-4 flex flex-col gap-4 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Recipients ({notifications.length})
                </span>
                <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-mono">
                  SMTP Sandbox Ready
                </span>
              </div>
              
              {loading ? (
                <div className="text-xs text-slate-500 py-6 text-center">Loading recipient list...</div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
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
                            ? "bg-teal-950/40 border-teal-500/40 text-teal-200"
                            : "bg-slate-900/40 border-slate-800/80 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold text-white truncate">{n.customerName}</div>
                          <div className="text-[11px] text-slate-400 truncate">{n.customerEmail}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isOpened && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Opened
                            </span>
                          )}
                          {isClicked && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
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

            {/* Live Interactive Actions */}
            <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                1-Click Interactive Test Lab
              </span>

              <button
                disabled={actionLoading || !selectedRecipient}
                onClick={handleSimulateOpen}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 disabled:opacity-50"
              >
                👁️ Simulate Email Open (Fires Pixel)
              </button>

              <button
                disabled={actionLoading || !selectedRecipient}
                onClick={handleSimulateClick}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-950/60 hover:bg-sky-900/80 text-sky-200 text-xs font-semibold transition border border-sky-600/40 disabled:opacity-50"
              >
                🖱️ Simulate CTA Click (Sets 14d Cookie)
              </button>

              <button
                disabled={actionLoading || !selectedRecipient}
                onClick={handleSimulateRazorpayPurchase}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                💳 Approve Payment on Razorpay Test Gateway
              </button>
            </div>

            {/* Live Simulation Activity Stream */}
            <div className="border-t border-slate-800/80 pt-3 flex-1 flex flex-col min-h-[100px]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Real-Time Event Stream
              </span>
              <div className="flex-1 overflow-y-auto space-y-1 max-h-32 text-[11px] font-mono">
                {activityLogs.length === 0 ? (
                  <div className="text-slate-600 italic py-2">No interactions simulated yet. Click buttons above to trigger live funnel events.</div>
                ) : (
                  activityLogs.map((log, i) => (
                    <div key={i} className="text-slate-300 bg-slate-900/60 p-1.5 rounded border border-slate-800/60">
                      <span className="text-slate-500 mr-1.5">[{log.time}]</span>
                      {log.text}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Rendered Email Preview */}
          <div className="md:col-span-8 p-6 flex flex-col gap-4 overflow-y-auto bg-[#070b12]">
            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
                  statusMessage.type === "success"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                }`}
              >
                <span>{statusMessage.text}</span>
                <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            )}

            {/* Email Canvas Preview */}
            <div className="border border-slate-800 rounded-2xl bg-[#0c121c] p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <div className="text-xs text-teal-400 font-bold uppercase tracking-wider">
                    RakshFit Nutrition &bull; AI Revenue Orchestrator
                  </div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {selectedRecipient?.subject || `Exclusive ${offerValue}% OFF — ${campaignName}`}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    To: <span className="text-slate-200">{selectedRecipient?.customerName}</span> &lt;{selectedRecipient?.customerEmail}&gt;
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-400 block">
                    Token: {selectedRecipient?.trackingToken?.slice(0, 14)}...
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mt-1">
                    1x1 Pixel Active
                  </span>
                </div>
              </div>

              {/* Email Body */}
              <div className="space-y-4 text-sm text-slate-300">
                <p className="font-semibold text-white">
                  Hi {selectedRecipient?.customerName || "Valued Customer"},
                </p>
                <p className="leading-relaxed text-slate-300">
                  {selectedRecipient?.body ||
                    `We have unlocked an exclusive ${offerValue}% discount on your next restock order. Claim your early access benefits before supplies run out.`}
                </p>

                {/* Discount Code Voucher Box */}
                <div className="p-4 rounded-xl bg-teal-500/10 border border-dashed border-teal-500/40 text-center my-4">
                  <div className="text-xs uppercase tracking-wider text-teal-400 font-bold mb-1">
                    ✨ Your Exclusive Member Offer
                  </div>
                  <div className="inline-block bg-slate-950 px-4 py-1.5 rounded-lg border border-teal-500/40 font-mono text-base font-extrabold text-white tracking-widest">
                    SAVE{offerValue}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1.5">
                    {offerValue}% instant discount applied at checkout
                  </div>
                </div>

                {/* Simulated CTA Button */}
                <div className="text-center py-2">
                  <a
                    href={selectedRecipient?.clickUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-lg shadow-teal-500/25 hover:from-teal-300 hover:to-emerald-400 transition transform hover:-translate-y-0.5"
                  >
                    {selectedRecipient?.cta || `Claim ${offerValue}% OFF Now →`}
                  </a>
                </div>
              </div>

              {/* Email Footer */}
              <div className="border-t border-slate-800/80 mt-6 pt-4 text-center text-[10px] text-slate-500">
                Sent automatically via AI Revenue Growth Orchestrator for RakshFit Nutrition.<br />
                Tracking tokens are cryptographically unique per customer for accurate ROI attribution.
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            💡 Tip: Clicking <strong>"Approve Payment on Razorpay Test Gateway"</strong> instantly creates a real attributed Order in PostgreSQL.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
          >
            Close Lab
          </button>
        </div>

      </div>
    </div>
  );
}

