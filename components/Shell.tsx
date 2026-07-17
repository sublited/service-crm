"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/customers", label: "Customers", icon: "users" },
  { href: "/services", label: "Services", icon: "tag" },
  { href: "/quotes", label: "Quotes", icon: "file" },
  { href: "/invoices", label: "Invoices", icon: "receipt" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

// Bottom tab bar on mobile only shows the most-used four — Services and
// Settings stay one tap away in the "More" drawer instead of crowding thumbs.
const MOBILE_TABS = NAV.slice(0, 4);

function NavIcon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, JSX.Element> = {
    home: <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />,
    users: <path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6 0a3.5 3.5 0 0 0 3-1.7M14.5 5a3.5 3.5 0 0 1 0 6.9" />,
    tag: <path d="m20.6 12.1-8.5 8.5a1.5 1.5 0 0 1-2.1 0L3.5 14.1a1.5 1.5 0 0 1 0-2.1L12 3.5h6a2 2 0 0 1 2 2v6.6ZM16 8h.01" />,
    file: <path d="M14 3v5a1 1 0 0 0 1 1h5M6 3h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />,
    receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 6h6M9 12h6M9 15h4" />,
    gear: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 1-.1 1.2l2 1.6-2 3.4-2.4-1a7.6 7.6 0 0 1-2 1.2l-.4 2.6h-4l-.4-2.6a7.6 7.6 0 0 1-2-1.2l-2.4 1-2-3.4 2-1.6a7.4 7.4 0 0 1 0-2.4l-2-1.6 2-3.4 2.4 1a7.6 7.6 0 0 1 2-1.2L9.6 3h4l.4 2.6a7.6 7.6 0 0 1 2 1.2l2.4-1 2 3.4-2 1.6c.07.4.1.8.1 1.2Z" />,
    close: <path d="M18 6 6 18M6 6l12 12" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-black/[0.06] bg-white flex-col">
        <div className="px-5 py-5 border-b border-black/[0.06]">
          <span className="font-display text-lg font-semibold tracking-tight">Service CRM</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand-50 text-brand-700" : "text-ink/70 hover:bg-black/[0.03]"
                )}
              >
                <NavIcon name={item.icon} className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-black/[0.06]">
          <button onClick={signOut} className="w-full text-left rounded-lg px-3 py-2 text-sm text-ink/50 hover:bg-black/[0.03]">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b border-black/[0.06] px-4"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)", paddingBottom: "0.75rem" }}
      >
        <span className="font-display text-lg font-semibold tracking-tight">Service CRM</span>
        <button onClick={() => setDrawerOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.04]" aria-label="Open menu">
          <NavIcon name="menu" className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile slide-over drawer (Services, Settings, sign out) */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-black/[0.06]">
              <span className="font-display font-semibold">Menu</span>
              <button onClick={() => setDrawerOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.04]" aria-label="Close menu">
                <NavIcon name="close" className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-1">
              {NAV.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
                      active ? "bg-brand-50 text-brand-700" : "text-ink/70 hover:bg-black/[0.03]"
                    )}
                  >
                    <NavIcon name={item.icon} className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-black/[0.06]">
              <button onClick={signOut} className="w-full text-left rounded-lg px-3 py-2 text-sm text-ink/50 hover:bg-black/[0.03]">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-black/[0.06] flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {MOBILE_TABS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium",
                active ? "text-brand-600" : "text-ink/45"
              )}
            >
              <NavIcon name={item.icon} className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
