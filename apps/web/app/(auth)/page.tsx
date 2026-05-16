"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@workspace/ui/components/button";
import { ReceiptThumbnail } from "@/components/receipt-thumbnail";
import { getClerkDisplayName } from "@/lib/clerk-display-name";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Plus, Trash2 } from "lucide-react";
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
import type { Id } from "@convex/_generated/dataModel";

export default function HomePage() {
  const { user } = useUser();
  const bills = useQuery(api.bills.list);
  const createBill = useMutation(api.bills.create);
  const removeBill = useMutation(api.bills.remove);
  const [newBillName, setNewBillName] = useState("");
  const [deletingBill, setDeletingBill] = useState<{
    id: Id<"bills">;
    name: string;
    status: string;
  } | null>(null);
  const router = useRouter();

  const handleCreate = async () => {
    if (!newBillName.trim()) return;
    const id = await createBill({
      name: newBillName.trim(),
      ownerName: getClerkDisplayName(user),
    });
    setNewBillName("");
    router.push(`/bill/${id}`);
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Split Bill</h1>
          <p className="text-muted-foreground text-sm">
            Upload receipts, split with friends
          </p>
        </div>
        <UserButton />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">New Bill</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="e.g. Dinner at Burnt Ends"
              value={newBillName}
              onChange={(e) => setNewBillName(e.target.value)}
            />
            <Button type="submit" disabled={!newBillName.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {bills === undefined ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : bills.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Receipt className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                No bills yet. Create one above.
              </p>
            </CardContent>
          </Card>
        ) : (
          bills.map((bill) => (
            <Card
              key={bill._id}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => router.push(`/bill/${bill._id}`)}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <ReceiptThumbnail imageId={bill.imageId} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{bill.name}</p>
                  <CardDescription>
                    {new Date(bill.createdAt).toLocaleDateString()} · {bill.status}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (bill.status === "shared" || bill.status === "settled") {
                      setDeletingBill({
                        id: bill._id,
                        name: bill.name,
                        status: bill.status,
                      });
                    } else {
                      removeBill({ id: bill._id });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog
        open={!!deletingBill}
        onOpenChange={(open) => !open && setDeletingBill(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deletingBill?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This bill has been {deletingBill?.status}. All line items, friends,
              and their claims will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingBill) {
                  removeBill({ id: deletingBill.id });
                  setDeletingBill(null);
                }
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
