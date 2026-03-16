"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { UserButton } from "@clerk/nextjs";
import { useState, useRef, useMemo } from "react";
import Image from "next/image";
import { useUploadReceipt } from "./_hooks/use-upload-receipt";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Share2,
  Loader2,
  Copy,
  Check,
  UserPlus,
  X,
} from "lucide-react";

export default function BillPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const billId = id as Id<"bills">;

  const bill = useQuery(api.bills.getWithImage, { id: billId });
  const receiptUrl = bill?.receiptUrl;
  const lineItems = useQuery(api.lineItems.list, { billId });
  const friends = useQuery(api.friends.list, { billId });
  const claims = useQuery(api.claims.list, { billId });

  const updateBill = useMutation(api.bills.update);
  const addItem = useMutation(api.lineItems.add);
  const updateItem = useMutation(api.lineItems.update);
  const removeItem = useMutation(api.lineItems.remove);
  const addFriend = useMutation(api.friends.add);
  const removeFriend = useMutation(api.friends.remove);
  const { mutate: uploadReceipt, isPending: uploading } = useUploadReceipt(billId);

  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newFriendName, setNewFriendName] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "friend" | "lineItem";
    id: Id<"friends"> | Id<"lineItems">;
    name: string;
    claimCount: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const claimsByFriend = useMemo(() => {
    const map = new Map<string, number>();
    if (!claims) return map;
    for (const c of claims) {
      map.set(c.friendId, (map.get(c.friendId) ?? 0) + 1);
    }
    return map;
  }, [claims]);

  const claimsByItem = useMemo(() => {
    const map = new Map<string, number>();
    if (!claims) return map;
    for (const c of claims) {
      map.set(c.lineItemId, (map.get(c.lineItemId) ?? 0) + 1);
    }
    return map;
  }, [claims]);

  if (!bill) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const subtotal =
    lineItems?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ??
    0;
  const total = subtotal + bill.tax + bill.serviceCharge;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${bill.shareId}`
      : "";

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPrice) return;
    await addItem({
      billId,
      name: newItemName.trim(),
      quantity: Number(newItemQty) || 1,
      unitPrice: Number(newItemPrice),
    });
    setNewItemName("");
    setNewItemQty("1");
    setNewItemPrice("");
  };

  const handleAddFriend = async () => {
    if (!newFriendName.trim()) return;
    await addFriend({ billId, name: newFriendName.trim() });
    setNewFriendName("");
  };

  const handleShare = async () => {
    await updateBill({ id: billId, status: "shared" });
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{bill.name}</h1>
            <p className="text-muted-foreground text-xs">{bill.status}</p>
          </div>
        </div>
        <UserButton />
      </div>

      {/* Receipt */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadReceipt(file);
            }}
          />
          {receiptUrl && (
            <div className="relative mb-3 aspect-3/4 w-full">
              <Image
                src={receiptUrl}
                alt="Receipt"
                fill
                className="rounded-md border object-contain"
              />
            </div>
          )}
          <Button
            variant="outline"
            size={receiptUrl ? "sm" : "default"}
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing receipt...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {receiptUrl ? "Re-upload receipt" : "Upload receipt photo"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems?.map((item) => (
            <div key={item._id} className="flex items-center gap-2">
              <Input
                defaultValue={item.name}
                className="flex-1"
                onBlur={(e) =>
                  updateItem({ id: item._id, name: e.target.value })
                }
              />
              <Input
                defaultValue={String(item.quantity)}
                className="w-16 text-center"
                type="number"
                min={1}
                onBlur={(e) =>
                  updateItem({
                    id: item._id,
                    quantity: Number(e.target.value) || 1,
                  })
                }
              />
              <Input
                defaultValue={item.unitPrice.toFixed(2)}
                className="w-24 text-right"
                type="number"
                step="0.01"
                onBlur={(e) =>
                  updateItem({
                    id: item._id,
                    unitPrice: Number(e.target.value) || 0,
                  })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const count = claimsByItem.get(item._id) ?? 0;
                  if (count > 0) {
                    setDeleteConfirm({
                      type: "lineItem",
                      id: item._id,
                      name: item.name,
                      claimCount: count,
                    });
                  } else {
                    removeItem({ id: item._id });
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <Separator />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddItem();
            }}
            className="flex items-center gap-2"
          >
            <Input
              placeholder="Item name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Qty"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              className="w-16 text-center"
              type="number"
              min={1}
            />
            <Input
              placeholder="Price"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className="w-24 text-right"
              type="number"
              step="0.01"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newItemName.trim() || !newItemPrice}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tax & Service Charge */}
      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label className="text-xs">Tax</Label>
            <Input
              type="number"
              step="0.01"
              defaultValue={bill.tax.toFixed(2)}
              onBlur={(e) =>
                updateBill({ id: billId, tax: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Service Charge</Label>
            <Input
              type="number"
              step="0.01"
              defaultValue={bill.serviceCharge.toFixed(2)}
              onBlur={(e) =>
                updateBill({
                  id: billId,
                  serviceCharge: Number(e.target.value) || 0,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>${bill.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service Charge</span>
            <span>${bill.serviceCharge.toFixed(2)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Friends */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Friends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {friends?.map((friend) => (
            <div key={friend._id} className="flex items-center justify-between">
              <span className="text-sm">{friend.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const count = claimsByFriend.get(friend._id) ?? 0;
                  if (count > 0) {
                    setDeleteConfirm({
                      type: "friend",
                      id: friend._id as Id<"friends">,
                      name: friend.name,
                      claimCount: count,
                    });
                  } else {
                    removeFriend({ id: friend._id });
                  }
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddFriend();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Friend's name"
              value={newFriendName}
              onChange={(e) => setNewFriendName(e.target.value)}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newFriendName.trim()}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Share & Split */}
      <Card>
        <CardContent className="space-y-3 py-4">
          {bill.status === "editing" ? (
            <Button
              className="w-full"
              onClick={handleShare}
              disabled={!friends?.length || !lineItems?.length}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share with friends
            </Button>
          ) : (
            <>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/share/${bill.shareId}`)}
              >
                View split
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteConfirm?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "friend"
                ? `${deleteConfirm.name} has claimed ${deleteConfirm.claimCount} item${deleteConfirm.claimCount === 1 ? "" : "s"}. Their claims will be removed and splits will change.`
                : `${deleteConfirm?.claimCount} person${deleteConfirm?.claimCount === 1 ? " has" : "s have"} claimed this item. Their claims will be removed and splits will change.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteConfirm) return;
                if (deleteConfirm.type === "friend") {
                  removeFriend({ id: deleteConfirm.id as Id<"friends"> });
                } else {
                  removeItem({ id: deleteConfirm.id as Id<"lineItems"> });
                }
                setDeleteConfirm(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
