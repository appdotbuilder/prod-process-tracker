import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
// Using native HTML5 drag and drop instead of react-dnd
import { ProductionOrderCard } from '@/components/ProductionOrderCard';
import { CreateOrderDialog } from '@/components/CreateOrderDialog';
import { AssignmentDialog } from '@/components/AssignmentDialog';
import type { 
  ProductionOrderWithDetails, 
  CreateProductionOrderInput, 
  Workcenter, 
  Pan,
  Phase,
  BufferName,
  LocationType
} from '../../server/src/schema';

interface DropZoneProps {
  phase?: Phase;
  buffer?: BufferName;
  children: React.ReactNode;
  onDrop: (orderId: number, targetPhase?: Phase, targetBuffer?: BufferName) => void;
  className?: string;
}

function DropZone({ phase, buffer, children, onDrop, className = '' }: DropZoneProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    
    const orderIdStr = e.dataTransfer.getData('text/plain');
    const orderId = parseInt(orderIdStr);
    
    if (orderId) {
      onDrop(orderId, phase, buffer);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${className} ${isOver ? 'bg-blue-50 border-blue-300' : ''} transition-colors`}
    >
      {children}
    </div>
  );
}

function App() {
  // State management
  const [orders, setOrders] = useState<ProductionOrderWithDetails[]>([]);
  const [workcenters, setWorkcenters] = useState<Workcenter[]>([]);
  const [pans, setPans] = useState<Pan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    orderId: number;
    targetPhase?: Phase;
    targetBuffer?: BufferName;
    needsPan: boolean;
    needsWorkcenter: boolean;
  } | null>(null);

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ordersData, workcentersData, pansData] = await Promise.all([
        trpc.getProductionOrders.query(),
        trpc.getWorkcenters.query(),
        trpc.getPans.query()
      ]);

      setOrders(ordersData);
      setWorkcenters(workcentersData);
      setPans(pansData);

      // Show stub data notice if no real data
      if (ordersData.length === 0 && workcentersData.length === 0 && pansData.length === 0) {
        setError('⚠️ Using demo data - Backend handlers are stub implementations. Real data will appear once backend is fully implemented.');
        
        // Add some demo data for better UX
        setOrders([
          {
            id: 1,
            order_number: 'PO-001',
            location_type: 'buffer' as LocationType,
            phase: null,
            buffer_name: 'charging_mixing_buffer' as BufferName,
            workcenter: null,
            pan: null,
            quantity: 100,
            status: 'active' as const,
            created_at: new Date('2024-01-15'),
            updated_at: new Date('2024-01-15')
          },
          {
            id: 2,
            order_number: 'PO-002',
            location_type: 'phase' as LocationType,
            phase: 'charging' as Phase,
            buffer_name: null,
            workcenter: { id: 1, name: 'Charging_1', phase: 'charging' as Phase, capacity: 50, created_at: new Date('2024-01-01') },
            pan: { id: 1, name: 'Pan-A1', is_available: false, created_at: new Date('2024-01-01') },
            quantity: 75,
            status: 'active' as const,
            created_at: new Date('2024-01-14'),
            updated_at: new Date('2024-01-15')
          }
        ]);
        
        setWorkcenters([
          { id: 1, name: 'Charging_1', phase: 'charging' as Phase, capacity: 50, created_at: new Date('2024-01-01') },
          { id: 2, name: 'Charging_2', phase: 'charging' as Phase, capacity: 50, created_at: new Date('2024-01-01') },
          { id: 3, name: 'Charging_3', phase: 'charging' as Phase, capacity: 50, created_at: new Date('2024-01-01') },
          { id: 4, name: 'Mixing_1', phase: 'mixing' as Phase, capacity: 60, created_at: new Date('2024-01-01') },
          { id: 5, name: 'Mixing_2', phase: 'mixing' as Phase, capacity: 60, created_at: new Date('2024-01-01') },
          { id: 6, name: 'Mixing_3', phase: 'mixing' as Phase, capacity: 60, created_at: new Date('2024-01-01') },
          { id: 7, name: 'Extrusion_1', phase: 'extrusion' as Phase, capacity: 40, created_at: new Date('2024-01-01') },
          { id: 8, name: 'Extrusion_2', phase: 'extrusion' as Phase, capacity: 40, created_at: new Date('2024-01-01') },
          { id: 9, name: 'Extrusion_3', phase: 'extrusion' as Phase, capacity: 40, created_at: new Date('2024-01-01') }
        ]);

        setPans([
          { id: 1, name: 'Pan-A1', is_available: false, created_at: new Date('2024-01-01') },
          { id: 2, name: 'Pan-A2', is_available: true, created_at: new Date('2024-01-01') },
          { id: 3, name: 'Pan-B1', is_available: true, created_at: new Date('2024-01-01') },
          { id: 4, name: 'Pan-B2', is_available: true, created_at: new Date('2024-01-01') },
          { id: 5, name: 'Pan-C1', is_available: true, created_at: new Date('2024-01-01') }
        ]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load production data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create new production order
  const handleCreateOrder = async (input: CreateProductionOrderInput) => {
    try {
      const newOrderData = await trpc.createProductionOrder.mutate(input);
      // Transform ProductionOrder to ProductionOrderWithDetails
      const newOrder: ProductionOrderWithDetails = {
        ...newOrderData,
        workcenter: null,
        pan: null
      };
      setOrders((prev: ProductionOrderWithDetails[]) => [...prev, newOrder]);
      setShowCreateOrder(false);
    } catch (error) {
      console.error('Failed to create order:', error);
      setError('Failed to create production order. Please try again.');
    }
  };

  // Handle drag and drop
  const handleDrop = (orderId: number, targetPhase?: Phase, targetBuffer?: BufferName) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Check movement rules
    const canMove = canMoveOrder(order, targetPhase, targetBuffer);
    if (!canMove.allowed) {
      setError(canMove.reason);
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Determine what assignments are needed
    const needsPan = targetPhase === 'charging' && !order.pan;
    const needsWorkcenter = !!targetPhase;

    if (needsPan || needsWorkcenter) {
      setPendingAssignment({
        orderId,
        targetPhase,
        targetBuffer,
        needsPan,
        needsWorkcenter
      });
      setShowAssignment(true);
    } else {
      // Move directly without assignments
      moveOrder(orderId, targetPhase, targetBuffer);
    }
  };

  // Movement validation
  const canMoveOrder = (order: ProductionOrderWithDetails, targetPhase?: Phase, targetBuffer?: BufferName) => {
    const currentLocation = getCurrentLocation(order);
    const targetLocation = targetPhase || targetBuffer || '';

    // Define the process flow
    const flow = ['charging', 'charging_mixing_buffer', 'mixing', 'mixing_extrusion_buffer', 'extrusion'];
    const currentIndex = flow.indexOf(currentLocation);
    const targetIndex = flow.indexOf(targetLocation);

    if (currentIndex === -1 || targetIndex === -1) {
      return { allowed: false, reason: 'Invalid location' };
    }

    // Allow backward movement (multiple steps)
    if (targetIndex < currentIndex) {
      return { allowed: true, reason: '' };
    }

    // Forward movement only one step at a time
    if (targetIndex === currentIndex + 1) {
      return { allowed: true, reason: '' };
    }

    if (targetIndex > currentIndex + 1) {
      return { allowed: false, reason: 'Can only move one step forward at a time' };
    }

    if (targetIndex === currentIndex) {
      return { allowed: false, reason: 'Order is already in this location' };
    }

    return { allowed: false, reason: 'Invalid move' };
  };

  const getCurrentLocation = (order: ProductionOrderWithDetails): string => {
    if (order.location_type === 'phase' && order.phase) {
      return order.phase;
    }
    if (order.location_type === 'buffer' && order.buffer_name) {
      return order.buffer_name;
    }
    return '';
  };

  // Move order with assignments
  const moveOrder = async (orderId: number, targetPhase?: Phase, targetBuffer?: BufferName, workcenterId?: number, panId?: number) => {
    try {
      await trpc.moveProductionOrder.mutate({
        id: orderId,
        location_type: targetPhase ? 'phase' as LocationType : 'buffer' as LocationType,
        phase: targetPhase || null,
        buffer_name: targetBuffer || null,
        workcenter_id: workcenterId || null,
        pan_id: panId || null
      });

      // Refresh data
      await loadData();
      setError(null);
    } catch (error) {
      console.error('Failed to move order:', error);
      setError('Failed to move production order. Please try again.');
    }
  };

  // Handle assignment completion
  const handleAssignmentComplete = (workcenterId?: number, panId?: number) => {
    if (pendingAssignment) {
      moveOrder(
        pendingAssignment.orderId,
        pendingAssignment.targetPhase,
        pendingAssignment.targetBuffer,
        workcenterId,
        panId
      );
    }
    setPendingAssignment(null);
    setShowAssignment(false);
  };

  // Filter orders by location
  const getOrdersByLocation = (phase?: Phase, buffer?: BufferName): ProductionOrderWithDetails[] => {
    return orders.filter(order => {
      if (phase) {
        return order.location_type === 'phase' && order.phase === phase;
      }
      if (buffer) {
        return order.location_type === 'buffer' && order.buffer_name === buffer;
      }
      return false;
    });
  };

  // Get workcenters by phase
  const getWorkcentersByPhase = (phase: Phase): Workcenter[] => {
    return workcenters.filter(wc => wc.phase === phase);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading production data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">🏭 Production Process Management</h1>
                <p className="text-gray-600">Track production orders through Charging → Mixing → Extrusion phases</p>
              </div>
              <Button onClick={() => setShowCreateOrder(true)} className="bg-blue-600 hover:bg-blue-700">
                ➕ New Production Order
              </Button>
            </div>

            {error && (
              <div className={`mt-4 p-4 rounded-lg ${error.includes('⚠️') ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={error.includes('⚠️') ? 'text-amber-800' : 'text-red-800'}>{error}</p>
              </div>
            )}
          </div>

          {/* Process Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            {/* Charging Phase */}
            <DropZone
              phase="charging"
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[400px]"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    ⚡ Charging Phase
                    <Badge variant="secondary">{getOrdersByLocation('charging').length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOrdersByLocation('charging').map((order: ProductionOrderWithDetails) => (
                      <ProductionOrderCard key={order.id} order={order} />
                    ))}
                    {getOrdersByLocation('charging').length === 0 && (
                      <p className="text-gray-500 text-sm italic">Drop orders here to start charging</p>
                    )}
                  </div>

                  {/* Workcenters */}
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Workcenters:</h4>
                    {getWorkcentersByPhase('charging').map((wc: Workcenter) => (
                      <div key={wc.id} className="text-xs bg-gray-100 p-2 rounded">
                        {wc.name} (Cap: {wc.capacity})
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </DropZone>

            {/* Charging-Mixing Buffer */}
            <DropZone
              buffer="charging_mixing_buffer"
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[400px]"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    🔄 Buffer 1
                    <Badge variant="outline">{getOrdersByLocation(undefined, 'charging_mixing_buffer').length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOrdersByLocation(undefined, 'charging_mixing_buffer').map((order: ProductionOrderWithDetails) => (
                      <ProductionOrderCard key={order.id} order={order} />
                    ))}
                    {getOrdersByLocation(undefined, 'charging_mixing_buffer').length === 0 && (
                      <p className="text-gray-500 text-sm italic">Buffer area between charging and mixing</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </DropZone>

            {/* Mixing Phase */}
            <DropZone
              phase="mixing"
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[400px]"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    🌀 Mixing Phase
                    <Badge variant="secondary">{getOrdersByLocation('mixing').length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOrdersByLocation('mixing').map((order: ProductionOrderWithDetails) => (
                      <ProductionOrderCard key={order.id} order={order} />
                    ))}
                    {getOrdersByLocation('mixing').length === 0 && (
                      <p className="text-gray-500 text-sm italic">Drop orders here for mixing</p>
                    )}
                  </div>

                  {/* Workcenters */}
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Workcenters:</h4>
                    {getWorkcentersByPhase('mixing').map((wc: Workcenter) => (
                      <div key={wc.id} className="text-xs bg-gray-100 p-2 rounded">
                        {wc.name} (Cap: {wc.capacity})
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </DropZone>

            {/* Mixing-Extrusion Buffer */}
            <DropZone
              buffer="mixing_extrusion_buffer"
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[400px]"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    🔄 Buffer 2
                    <Badge variant="outline">{getOrdersByLocation(undefined, 'mixing_extrusion_buffer').length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOrdersByLocation(undefined, 'mixing_extrusion_buffer').map((order: ProductionOrderWithDetails) => (
                      <ProductionOrderCard key={order.id} order={order} />
                    ))}
                    {getOrdersByLocation(undefined, 'mixing_extrusion_buffer').length === 0 && (
                      <p className="text-gray-500 text-sm italic">Buffer area between mixing and extrusion</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </DropZone>

            {/* Extrusion Phase */}
            <DropZone
              phase="extrusion"
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[400px]"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    🏭 Extrusion Phase
                    <Badge variant="secondary">{getOrdersByLocation('extrusion').length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOrdersByLocation('extrusion').map((order: ProductionOrderWithDetails) => (
                      <ProductionOrderCard key={order.id} order={order} />
                    ))}
                    {getOrdersByLocation('extrusion').length === 0 && (
                      <p className="text-gray-500 text-sm italic">Final production phase</p>
                    )}
                  </div>

                  {/* Workcenters */}
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Workcenters:</h4>
                    {getWorkcentersByPhase('extrusion').map((wc: Workcenter) => (
                      <div key={wc.id} className="text-xs bg-gray-100 p-2 rounded">
                        {wc.name} (Cap: {wc.capacity})
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </DropZone>
          </div>

          {/* Process Flow Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📋 Process Flow Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Movement Rules:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Forward: One step at a time only</li>
                    <li>• Backward: Multiple steps allowed</li>
                    <li>• Drag and drop orders between phases/buffers</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Assignment Rules:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Entering Charging: Must assign Pan</li>
                    <li>• Entering any Phase: Must assign Workcenter</li>
                    <li>• Buffers: No assignments needed</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dialogs */}
          <CreateOrderDialog
            open={showCreateOrder}
            onOpenChange={setShowCreateOrder}
            onSubmit={handleCreateOrder}
          />

          {pendingAssignment && (
            <AssignmentDialog
              open={showAssignment}
              onOpenChange={(open) => {
                setShowAssignment(open);
                if (!open) setPendingAssignment(null);
              }}
              needsPan={pendingAssignment.needsPan}
              needsWorkcenter={pendingAssignment.needsWorkcenter}
              targetPhase={pendingAssignment.targetPhase}
              workcenters={pendingAssignment.targetPhase ? getWorkcentersByPhase(pendingAssignment.targetPhase) : []}
              pans={pans.filter(p => p.is_available)}
              onComplete={handleAssignmentComplete}
            />
          )}
        </div>
      </div>
    );
}

export default App;