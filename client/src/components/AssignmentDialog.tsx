import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import type { Workcenter, Pan, Phase } from '../../../server/src/schema';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  needsPan: boolean;
  needsWorkcenter: boolean;
  targetPhase?: Phase;
  workcenters: Workcenter[];
  pans: Pan[];
  onComplete: (workcenterId?: number, panId?: number) => void;
}

export function AssignmentDialog({ 
  open, 
  onOpenChange, 
  needsPan, 
  needsWorkcenter, 
  targetPhase, 
  workcenters, 
  pans, 
  onComplete 
}: AssignmentDialogProps) {
  const [selectedWorkcenter, setSelectedWorkcenter] = useState<string>('');
  const [selectedPan, setSelectedPan] = useState<string>('');

  const handleComplete = () => {
    const workcenterId = selectedWorkcenter ? parseInt(selectedWorkcenter) : undefined;
    const panId = selectedPan ? parseInt(selectedPan) : undefined;
    
    onComplete(workcenterId, panId);
    
    // Reset form
    setSelectedWorkcenter('');
    setSelectedPan('');
  };

  const canComplete = () => {
    if (needsWorkcenter && !selectedWorkcenter) return false;
    if (needsPan && !selectedPan) return false;
    return true;
  };

  const getPhaseIcon = (phase?: Phase) => {
    switch (phase) {
      case 'charging': return '⚡';
      case 'mixing': return '🌀';
      case 'extrusion': return '🏭';
      default: return '📋';
    }
  };

  const getPhaseName = (phase?: Phase) => {
    if (!phase) return 'Phase';
    return phase.charAt(0).toUpperCase() + phase.slice(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getPhaseIcon(targetPhase)} Assign Resources
          </DialogTitle>
          <DialogDescription>
            {needsPan && needsWorkcenter && (
              <>Assign a pan and workcenter for the {getPhaseName(targetPhase)} phase.</>
            )}
            {needsPan && !needsWorkcenter && (
              <>Assign a pan for the {getPhaseName(targetPhase)} phase.</>
            )}
            {!needsPan && needsWorkcenter && (
              <>Assign a workcenter for the {getPhaseName(targetPhase)} phase.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {needsWorkcenter && (
            <div className="space-y-3">
              <Label htmlFor="workcenter">Select Workcenter</Label>
              <Select value={selectedWorkcenter} onValueChange={setSelectedWorkcenter}>
                <SelectTrigger id="workcenter">
                  <SelectValue placeholder="Choose a workcenter..." />
                </SelectTrigger>
                <SelectContent>
                  {workcenters.map((wc: Workcenter) => (
                    <SelectItem key={wc.id} value={wc.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{wc.name}</span>
                        <Badge variant="outline" className="ml-2">
                          Cap: {wc.capacity}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {workcenters.length === 0 && (
                <p className="text-sm text-amber-600">⚠️ No workcenters available for this phase</p>
              )}
            </div>
          )}

          {needsPan && (
            <div className="space-y-3">
              <Label htmlFor="pan">Select Pan</Label>
              <Select value={selectedPan} onValueChange={setSelectedPan}>
                <SelectTrigger id="pan">
                  <SelectValue placeholder="Choose a pan..." />
                </SelectTrigger>
                <SelectContent>
                  {pans.map((pan: Pan) => (
                    <SelectItem key={pan.id} value={pan.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{pan.name}</span>
                        <Badge variant="outline" className="ml-2 text-green-600">
                          Available
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pans.length === 0 && (
                <p className="text-sm text-amber-600">⚠️ No pans available</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleComplete}
              disabled={!canComplete()}
            >
              Assign & Move
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}