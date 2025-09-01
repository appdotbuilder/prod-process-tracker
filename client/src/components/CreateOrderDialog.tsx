import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import type { CreateProductionOrderInput } from '../../../server/src/schema';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProductionOrderInput) => Promise<void>;
}

export function CreateOrderDialog({ open, onOpenChange, onSubmit }: CreateOrderDialogProps) {
  const [formData, setFormData] = useState<CreateProductionOrderInput>({
    order_number: '',
    quantity: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.order_number.trim() || formData.quantity <= 0) {
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        order_number: '',
        quantity: 0
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev: CreateProductionOrderInput) => ({ 
      ...prev, 
      order_number: e.target.value 
    }));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev: CreateProductionOrderInput) => ({ 
      ...prev, 
      quantity: parseInt(e.target.value) || 0 
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Production Order</DialogTitle>
          <DialogDescription>
            Enter the details for the new production order. It will start in the charging phase queue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="order_number">Order Number</Label>
            <Input
              id="order_number"
              placeholder="e.g., PO-001"
              value={formData.order_number}
              onChange={handleOrderNumberChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="100"
              min="1"
              value={formData.quantity || ''}
              onChange={handleQuantityChange}
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.order_number.trim() || formData.quantity <= 0}
            >
              {isLoading ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}