import { Home, Video, FolderOpen, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Video, label: 'Record', path: '/record' },
  { icon: FolderOpen, label: 'Library', path: '/library' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const AppSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-glow">
                <img src={logo} alt="FlowRec" className="w-full h-full object-cover" />
              </div>
              <span className="font-semibold text-lg text-sidebar-foreground">FlowRec</span>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-10 h-10 rounded-xl overflow-hidden shadow-glow mx-auto"
            >
              <img src={logo} alt="FlowRec" className="w-full h-full object-cover" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                "hover:bg-sidebar-accent group relative",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                />
              )}
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                )}
              />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className={cn(
                      "text-sm font-medium whitespace-nowrap overflow-hidden",
                      isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl",
            "bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors",
            "text-sidebar-foreground/70 hover:text-sidebar-foreground"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
};
