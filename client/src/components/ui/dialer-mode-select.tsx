import { useState, useRef, useEffect } from "react"
import { MousePointerClick, Zap, FastForward, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialerModeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const MODES = [
  {
    id: "preview",
    icon: <MousePointerClick className="h-4 w-4" />,
    title: "Preview Dialer (Manual)",
    description: "Review lead details before initiating the call.",
  },
  {
    id: "power",
    icon: <Zap className="h-4 w-4" />,
    title: "Power Dialer (Auto-next)",
    description: "Automatically dial the next lead immediately after hanging up.",
  },
  {
    id: "progressive",
    icon: <FastForward className="h-4 w-4" />,
    title: "Progressive Dialer",
    description: "Dial next lead while you wrap up notes on the previous one.",
  },
]

export function DialerModeSelect({ value, onChange }: DialerModeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedMode = MODES.find((m) => m.id === value) || MODES[0]

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full rounded-2xl shadow-2xl overflow-hidden cursor-pointer select-none border transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "bg-surface",
        isOpen ? "border-foreground/50 shadow-foreground/10" : "border-border hover:border-white/20",
        isOpen ? "rounded-3xl" : "rounded-2xl"
      )}
    >
      {/* Header (Trigger) */}
      <div 
        className="flex items-center gap-4 p-3 bg-black/20"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300",
          isOpen ? "bg-foreground/20 text-muted-foreground" : "bg-muted text-muted-foreground"
        )}>
          {selectedMode.icon}
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="text-base font-semibold text-foreground">{selectedMode.title}</h3>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isOpen ? "opacity-0 max-h-0 mt-0" : "opacity-100 max-h-6 mt-0.5"
            )}
          >
            {selectedMode.description}
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center mr-2">
          <ChevronUp
            className={cn(
              "h-5 w-5 text-muted-foreground text-opacity-70 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isOpen ? "rotate-0 text-foreground" : "rotate-180"
            )}
          />
        </div>
      </div>

      {/* Options List */}
      <div
        className={cn(
          "grid bg-surface",
          "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-2 pb-2 pt-1 border-t border-border">
            <div className="space-y-1">
              {MODES.map((mode, index) => {
                const isSelected = mode.id === value;
                return (
                  <div
                    key={mode.id}
                    onClick={() => {
                      onChange(mode.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-xl p-3",
                      "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                      isSelected ? "bg-foreground/10" : "hover:bg-muted",
                      isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                    )}
                    style={{
                      transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
                    }}
                  >
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                      isSelected ? "bg-foreground/20 text-muted-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {mode.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        "text-sm font-semibold",
                        isSelected ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {mode.title}
                      </h4>
                      <p className="text-sm text-muted-foreground text-opacity-70 truncate">{mode.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
