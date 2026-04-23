import { useState, useRef, useEffect } from "react"
import { Phone, Wifi, Smartphone, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProviderSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const PROVIDERS = [
  {
    id: "telnyx",
    icon: <Wifi className="h-4 w-4" />,
    badge: "Tx",
    badgeColor: "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900",
    title: "Telnyx",
    description: "WebRTC SIP — browser-based calling with full control.",
  },
  {
    id: "twilio",
    icon: <Phone className="h-4 w-4" />,
    badge: "Tw",
    badgeColor: "bg-[#F22F46] text-white",
    title: "Twilio",
    description: "Voice API — reliable cloud telephony infrastructure.",
  },
  {
    id: "local",
    icon: <Smartphone className="h-4 w-4" />,
    badge: null,
    badgeColor: "",
    title: "Local SIM",
    description: "Native dialer — uses your phone's SIM card minutes.",
  },
]

export function ProviderSelect({ value, onChange }: ProviderSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedProvider = PROVIDERS.find((p) => p.id === value) || PROVIDERS[0]

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
        "w-full rounded-2xl overflow-hidden cursor-pointer select-none border transition-all duration-300 ease-out shadow-sm hover:shadow",
        "bg-background",
        isOpen ? "border-primary shadow-primary/5" : "border-input hover:border-foreground/30",
        isOpen ? "rounded-2xl" : "rounded-2xl"
      )}
    >
      {/* Header (Trigger) */}
      <div 
        className="flex items-center gap-4 p-4 bg-transparent hover:bg-muted/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300 font-bold text-xs shrink-0",
          selectedProvider.badge
            ? selectedProvider.badgeColor
            : (isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
        )}>
          {selectedProvider.badge ? selectedProvider.badge : selectedProvider.icon}
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="text-base font-semibold text-foreground">{selectedProvider.title}</h3>
          <p
            className={cn(
              "text-sm text-muted-foreground transition-all duration-300",
              isOpen ? "opacity-0 max-h-0 mt-0" : "opacity-100 max-h-6 mt-1"
            )}
          >
            {selectedProvider.description}
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
          "grid bg-background",
          "transition-all duration-300 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-2 pb-2 pt-1 border-t border-border">
            <div className="space-y-1">
              {PROVIDERS.map((provider, index) => {
                const isSelected = provider.id === value;
                return (
                  <div
                    key={provider.id}
                    onClick={() => {
                      onChange(provider.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-start gap-4 rounded-xl p-3 cursor-pointer",
                      "transition-all duration-300 ease-out",
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                      isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    )}
                    style={{
                      transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
                    }}
                  >
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 font-bold text-xs",
                      provider.badge
                        ? provider.badgeColor
                        : (isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
                    )}>
                      {provider.badge ? provider.badge : provider.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        "text-sm font-semibold",
                        isSelected ? "text-primary" : "text-foreground"
                      )}>
                        {provider.title}
                      </h4>
                      <p className="text-sm text-muted-foreground text-opacity-70 truncate">{provider.description}</p>
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
