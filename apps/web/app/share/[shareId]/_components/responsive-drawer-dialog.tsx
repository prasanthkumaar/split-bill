"use client"

import type * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"
import { cn } from "@workspace/ui/lib/utils"

type ResponsiveDrawerDialogProps = {
  open: boolean
  onOpenChange?: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  showCloseButton?: boolean
  desktopMode?: "dialog" | "drawer"
  contentClassName?: string
  headerClassName?: string
  titleClassName?: string
  descriptionClassName?: string
  bodyClassName?: string
  footerClassName?: string
}

export function ResponsiveDrawerDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  showCloseButton = false,
  desktopMode = "dialog",
  contentClassName,
  headerClassName,
  titleClassName,
  descriptionClassName,
  bodyClassName,
  footerClassName,
}: ResponsiveDrawerDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const useDialog = isDesktop && desktopMode === "dialog"

  if (useDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={showCloseButton}
          className={cn(
            "flex max-h-[calc(100vh-4rem)] flex-col gap-0 p-0",
            contentClassName
          )}
        >
          <DialogHeader
            className={cn("gap-3 px-6 pt-6 pb-4 text-center", headerClassName)}
          >
            <DialogTitle className={cn("text-lg", titleClassName)}>
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription
                className={cn(
                  "text-sm leading-relaxed text-muted-foreground",
                  descriptionClassName
                )}
              >
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto px-6 pb-6",
              bodyClassName
            )}
          >
            {children}
          </div>
          {footer ? (
            <div
              className={cn("flex justify-end gap-1 px-6 pb-6", footerClassName)}
            >
              {footer}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={contentClassName}>
        <DrawerHeader
          className={cn(
            "gap-3 px-4 pt-4 pb-4 text-center md:px-6 md:text-center",
            headerClassName
          )}
        >
          <DrawerTitle className={cn("text-lg", titleClassName)}>
            {title}
          </DrawerTitle>
          {description ? (
            <DrawerDescription
              className={cn(
                "text-sm leading-relaxed text-muted-foreground",
                descriptionClassName
              )}
            >
              {description}
            </DrawerDescription>
          ) : null}
        </DrawerHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6",
            bodyClassName
          )}
        >
          {children}
        </div>
        {footer ? (
          <div
            className={cn(
              "mt-auto flex flex-col gap-1 px-4 pb-8 md:px-6",
              footerClassName
            )}
          >
            {footer}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
