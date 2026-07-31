import React, { useState } from "react";
import { Plus, Edit2, Trash2, Award, Sparkles, Save, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MilestoneDefinition } from "@/lib/engagement-streaks";
import { toast } from "sonner";

interface AdminMilestonesEditorProps {
  milestones: MilestoneDefinition[];
  onSave: (updated: MilestoneDefinition[]) => void;
}

export function AdminMilestonesEditor({ milestones, onSave }: AdminMilestonesEditorProps) {
  const [list, setList] = useState<MilestoneDefinition[]>(milestones);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [triggerCondition, setTriggerCondition] = useState("");
  const [badgeIcon, setBadgeIcon] = useState("Award");
  const [description, setDescription] = useState("");
  const [bonusFreeze, setBonusFreeze] = useState(false);
  const [entityType, setEntityType] = useState<"store" | "agent" | "both">("store");

  const openAdd = () => {
    setEditId(null);
    setName("");
    setTriggerCondition("");
    setBadgeIcon("Award");
    setDescription("");
    setBonusFreeze(false);
    setEntityType("store");
    setIsOpen(true);
  };

  const openEdit = (m: MilestoneDefinition) => {
    setEditId(m.id);
    setName(m.name);
    setTriggerCondition(m.triggerCondition);
    setBadgeIcon(m.badgeIcon);
    setDescription(m.description);
    setBonusFreeze(Boolean(m.bonusFreeze));
    setEntityType(m.entityType);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = list.filter((m) => m.id !== id);
    setList(updated);
    onSave(updated);
    toast.success("Milestone removed!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !triggerCondition.trim()) {
      toast.error("Please provide both name and trigger condition");
      return;
    }

    if (editId) {
      const updated = list.map((m) =>
        m.id === editId
          ? { ...m, name: name.trim(), triggerCondition: triggerCondition.trim(), badgeIcon, description: description.trim(), bonusFreeze, entityType }
          : m
      );
      setList(updated);
      onSave(updated);
    } else {
      const newDef: MilestoneDefinition = {
        id: `milestone_${Date.now()}`,
        name: name.trim(),
        triggerCondition: triggerCondition.trim(),
        badgeIcon,
        description: description.trim(),
        bonusFreeze,
        entityType,
      };
      const updated = [...list, newDef];
      setList(updated);
      onSave(updated);
    }

    setIsOpen(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span>Milestone Definitions Configuration</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure dynamic engagement rules, badge icons, and streak freeze rewards for stores and agents without redeploying code.
          </p>
        </div>

        <Button onClick={openAdd} size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
          <Plus className="h-3.5 w-3.5" /> Add Milestone
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((m) => (
          <div key={m.id} className="p-3 rounded-lg border border-border/80 bg-muted/20 flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-xs text-foreground truncate">{m.name}</p>
                <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                  {m.triggerCondition}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{m.description}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                <span>Type: <strong className="text-foreground capitalize">{m.entityType}</strong></span>
                {m.bonusFreeze && <span className="text-emerald-600 font-bold">+1 Bonus Freeze</span>}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => openEdit(m)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Edit Milestone"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="Delete Milestone"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editId ? "Edit Milestone Definition" : "Create Milestone Definition"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 pt-1 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold">Milestone Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Century Sales Hero" className="h-8 text-xs" required />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold">Trigger Condition *</Label>
              <Input
                value={triggerCondition}
                onChange={(e) => setTriggerCondition(e.target.value)}
                placeholder="e.g. sale_100, first_sale, streak_14"
                className="h-8 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold">Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short badge unlocked description..." className="h-8 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="font-semibold">Badge Icon</Label>
                <select
                  value={badgeIcon}
                  onChange={(e) => setBadgeIcon(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="Award">Award</option>
                  <option value="ShoppingBag">ShoppingBag</option>
                  <option value="Flame">Flame</option>
                  <option value="Crown">Crown</option>
                  <option value="Sparkles">Sparkles</option>
                  <option value="ArrowRightLeft">ArrowRightLeft</option>
                  <option value="FileText">FileText</option>
                  <option value="UserPlus">UserPlus</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Entity Target</Label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value as "store" | "agent" | "both")}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="store">Storefront</option>
                  <option value="agent">Agent Network</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="bonus-freeze"
                checked={bonusFreeze}
                onChange={(e) => setBonusFreeze(e.target.checked)}
                className="h-4 w-4 rounded border-border text-emerald-600"
              />
              <Label htmlFor="bonus-freeze" className="font-semibold cursor-pointer">
                Awards +1 Streak Freeze on unlock
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Save Milestone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
