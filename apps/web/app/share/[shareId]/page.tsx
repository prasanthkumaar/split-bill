"use client"

import { useParams } from "next/navigation"
import { ShareSession } from "./share-session"

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>()
  return <ShareSession shareId={shareId} />
}
