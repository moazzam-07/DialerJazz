import React, { useEffect, useState } from "react"
import { AnimatePresence, motion, MotionConfig } from "framer-motion"
import { ChevronDownIcon, X } from "lucide-react"

export type TSelectData = {
  id: string
  label: string
  value: string
  description?: string
  icon?: React.ReactNode | string
  disabled?: boolean
  custom?: React.ReactNode
}

type SelectProps = {
  data?: TSelectData[]
  onChange?: (value: string) => void
  defaultValue?: string
  disabled?: boolean
  title?: string
}

const Select = ({ data, defaultValue, onChange, disabled, title = "Select Option" }: SelectProps) => {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<TSelectData | undefined>(undefined)

  useEffect(() => {
    if (defaultValue) {
      const item = data?.find((i) => i.value === defaultValue)
      if (item) {
        setSelected(item)
      }
    } else {
      setSelected(data?.[0])
    }
  }, [defaultValue, data])

  const onSelect = (value: string) => {
    if (disabled) return;
    const item = data?.find((i) => i.value === value)
    setSelected(item as TSelectData)
    if (onChange) onChange(value)
    setOpen(false)
  }

  return (
    <MotionConfig
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
    >
      <div className={`relative ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}>
        <AnimatePresence mode="popLayout">
          {!open ? (
            <motion.div
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              animate={{
                borderRadius: 12, // More standard rounded look instead of 30 if they prefer, but I'll stick to 16
              }}
              layout
              layoutId={`dropdown-${title.replace(/\s+/g, '-')}`}
              onClick={() => { if (!disabled) setOpen(true) }}
              className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-surface shadow-sm cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <SelectItem item={selected} noDescription={true} onChange={() => {}} prefix={title} />
            </motion.div>
          ) : (
            <motion.div
              layout
              animate={{
                borderRadius: 16,
              }}
              layoutId={`dropdown-${title.replace(/\s+/g, '-')}`}
              className="absolute z-50 overflow-hidden rounded-2xl w-full sm:w-[400px] border border-black/10 dark:border-white/10 bg-surface py-2 shadow-xl"
              ref={ref}
            >
              <Head setOpen={setOpen} title={title} />
              <div className="w-full max-h-[300px] overflow-y-auto">
                {data?.map((item) => (
                  <SelectItem
                    order={item?.value}
                    noDescription={false}
                    key={item.id}
                    item={item}
                    onChange={onSelect}
                    prefix={title}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

export default Select

const Head = ({ setOpen, title }: { setOpen: (open: boolean) => void, title: string }) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      transition={{
        delay: 0.1,
      }}
      layout
      className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5 mb-1"
    >
      <motion.strong layout className="text-foreground text-sm font-bold">
        {title}
      </motion.strong>
      <button
        onClick={() => setOpen(false)}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-muted hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="text-muted-foreground" size={14} />
      </button>
    </motion.div>
  )
}

type SelectItemProps = {
  item?: TSelectData
  noDescription?: boolean
  order?: string
  onChange?: (index: string) => void
  prefix?: string
}

const animation: any = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: (custom: number) => ({
      delay: custom * 0.1,
      duration: 0.5,
    }),
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: (custom: number) => ({
      delay: custom * 0.1,
    }),
  },
}

// Ensure custom is treated as 0 if undefined to prevent NaN issues
const SelectItem = ({
  item,
  noDescription = false,
  order,
  onChange,
  prefix = "select",
}: SelectItemProps) => {
  return (
    <motion.div
      className={`group flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
        noDescription && "!py-3"
      }`}
      variants={animation}
      initial="hidden"
      animate="visible"
      exit="exit"
      key={"product-" + item?.id + "-order-" + order}
      custom={typeof order === 'string' ? 0 : order}
      onClick={() => onChange?.(order as string)}
    >
      <div className="flex items-center gap-3">
        {item?.icon && (
          <motion.div
            layout
            layoutId={`${prefix.replace(/\s+/g, '-')}-icon-${item?.id}`}
            className={`flex h-10 w-10 items-center justify-center rounded-full ${noDescription ? 'bg-transparent text-foreground' : 'bg-muted text-foreground'}`}
          >
            {item.icon}
          </motion.div>
        )}
        <motion.div layout className="flex flex-col">
          <motion.strong
            layoutId={`${prefix.replace(/\s+/g, '-')}-label-${item?.id}`}
            className="text-sm font-semibold text-foreground whitespace-nowrap"
          >
            {item?.label || 'Select...'}
          </motion.strong>
          {(!noDescription && item?.description) ? (
            <span className="text-xs text-muted-foreground mt-0.5 line-clamp-2 pr-4">
              {item?.description}
            </span>
          ) : null}
        </motion.div>
      </div>
      {noDescription ? (
        <motion.div
          layout
          className="flex items-center justify-center pl-2"
        >
          <ChevronDownIcon className="text-muted-foreground" size={18} />
        </motion.div>
      ) : null}
    </motion.div>
  )
}
