import React from "react";
import { Store, Boxes, BarChart3, Settings } from "lucide-react";

export type NavTab = "pos" | "stock" | "reports" | "settings";

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  cartCount: number;
  lowStockCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  cartCount,
  lowStockCount,
}) => {
  const navItems = [
    {
      id: "pos" as NavTab,
      label: "Kasir (POS)",
      icon: Store,
      badge: cartCount > 0 ? cartCount : null,
      badgeColor: "bg-amber-600 text-white",
    },
    {
      id: "stock" as NavTab,
      label: "Stok Barang",
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: "bg-rose-600 text-white",
    },
    {
      id: "reports" as NavTab,
      label: "Laporan",
      icon: BarChart3,
      badge: null,
      badgeColor: "",
    },
    {
      id: "settings" as NavTab,
      label: "Pengaturan",
      icon: Settings,
      badge: null,
      badgeColor: "",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-4 h-15">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`tab-nav-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-1 transition-all relative ${
                isActive
                  ? "text-amber-800 font-semibold"
                  : "text-stone-500 hover:text-stone-700 active:scale-95"
              }`}
            >
              {/* Active Indicator Top pill */}
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-amber-700 rounded-b-full shadow-xs" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110 text-amber-800" : ""}`} />
                {item.badge !== null && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold ${item.badgeColor} shadow-xs animate-in zoom-in-50`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] leading-tight tracking-tight whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
