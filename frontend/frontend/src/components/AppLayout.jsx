import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./Navbar";

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="app-shell text-ink-soft">
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <footer className="border-t border-ink-border/80 py-6 text-center text-[11px] text-ink-muted">
        AI Revenue & Growth Orchestrator · Razorpay Buildathon Track 01
      </footer>
    </div>
  );
}
