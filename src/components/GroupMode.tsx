import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberManager } from "@/components/MemberManager";
import { GroupDetail } from "@/components/GroupDetail";
import {
  type Group,
  getGroups,
  addGroup,
  deleteGroup,
  getMembers,
  setMembers as saveMembers,
  type Member,
} from "@/lib/store";

export function GroupMode() {
  const [groups, setGroups] = useState<Group[]>(() => getGroups());
  const [members, setMembersState] = useState<Member[]>(() => getMembers());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const updated = addGroup(newGroupName);
    setGroups(updated);
    setNewGroupName("");
    setShowNewGroup(false);
  };

  const handleDeleteGroup = (id: string) => {
    const updated = deleteGroup(id);
    setGroups(updated);
  };

  // If a group is selected, show GroupDetail
  if (selectedGroup) {
    return (
      <GroupDetail
        group={selectedGroup}
        onBack={() => setSelectedGroupId(null)}
        onGroupUpdate={(updated) => setGroups(updated)}
      />
    );
  }

  // Group list view
  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Global Member Manager */}
      <div className="ios-card p-4">
        <MemberManager members={members} onUpdate={(m) => { saveMembers(m); setMembersState(m); }} />
      </div>

      {/* Group List Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground text-lg">我的團體</h2>
        <Button
          variant="iosGhost"
          size="sm"
          onClick={() => setShowNewGroup(!showNewGroup)}
        >
          <Plus className="w-4 h-4" />
          新增團體
        </Button>
      </div>

      {/* New Group Form */}
      <AnimatePresence>
        {showNewGroup && (
          <motion.div
            className="ios-card p-4 flex flex-col gap-3"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="輸入團體名稱（如：眠月線登山團）"
              className="h-12 rounded-xl bg-secondary px-4 text-foreground outline-none focus:ring-2 focus:ring-ios-blue transition-all"
              onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="iosSecondary"
                size="lg"
                className="flex-1"
                onClick={() => { setShowNewGroup(false); setNewGroupName(""); }}
              >
                取消
              </Button>
              <Button
                variant="ios"
                size="lg"
                className="flex-1"
                onClick={handleAddGroup}
                disabled={!newGroupName.trim()}
              >
                建立
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Cards */}
      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {groups.map((g, i) => (
            <motion.div
              key={g.id}
              className="ios-card px-4 py-4 flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedGroupId(g.id)}
            >
              <div className="w-11 h-11 rounded-2xl bg-ios-blue/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-ios-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {g.memberIds.length} 位成員 · {new Date(g.createdAt).toLocaleDateString("zh-TW")}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }}
                className="touch-target p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {groups.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">尚無團體</p>
            <p className="text-muted-foreground/60 text-xs mt-1">點擊上方「新增團體」開始</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
