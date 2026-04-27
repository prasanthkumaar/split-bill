import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"

type TotalsCardProps = {
  tax: number
  serviceCharge: number
  subtotal: number
  total: number
  onTaxBlur: (value: number) => void
  onServiceChargeBlur: (value: number) => void
}

export function TotalsCard({
  tax,
  serviceCharge,
  subtotal,
  total,
  onTaxBlur,
  onServiceChargeBlur,
}: TotalsCardProps) {
  return (
    <>
      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label className="text-xs">Tax</Label>
            <Input
              key={`tax-${tax}`}
              type="number"
              step="0.01"
              defaultValue={tax.toFixed(2)}
              onBlur={(event) => onTaxBlur(Number(event.target.value) || 0)}
            />
          </div>
          <div>
            <Label className="text-xs">Service Charge</Label>
            <Input
              key={`sc-${serviceCharge}`}
              type="number"
              step="0.01"
              defaultValue={serviceCharge.toFixed(2)}
              onBlur={(event) =>
                onServiceChargeBlur(Number(event.target.value) || 0)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service Charge</span>
            <span>${serviceCharge.toFixed(2)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
