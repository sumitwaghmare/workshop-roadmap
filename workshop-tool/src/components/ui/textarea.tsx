import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-base text-white transition-all outline-none placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
