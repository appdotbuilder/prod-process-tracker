import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import type { ProductionOrderWithDetails } from '../../../server/src/schema';

interface ProductionOrderCardProps {
  order: ProductionOrderWithDetails;
}

export function ProductionOrderCard({ order }: ProductionOrderCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', order.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`cursor-move production-card ${isDragging ? 'dragging' : ''}`}
    >
      <Card className="border-2">
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Header */}
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-sm">{order.order_number}</h3>
              <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                {order.status}
              </Badge>
            </div>

            {/* Quantity */}
            <div className="text-xs text-gray-600">
              Quantity: <span className="font-medium">{order.quantity}</span>
            </div>

            {/* Assignments */}
            <div className="space-y-1">
              {order.workcenter && (
                <div className="text-xs">
                  <span className="text-gray-500">Workcenter:</span>
                  <Badge variant="outline" className="ml-1 text-xs">
                    {order.workcenter.name}
                  </Badge>
                </div>
              )}

              {order.pan && (
                <div className="text-xs">
                  <span className="text-gray-500">Pan:</span>
                  <Badge variant="outline" className="ml-1 text-xs">
                    {order.pan.name}
                  </Badge>
                </div>
              )}
            </div>

            {/* Creation date */}
            <div className="text-xs text-gray-400">
              Created: {order.created_at.toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}