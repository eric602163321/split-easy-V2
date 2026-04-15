import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type Member,
  getMembers,
  setMembers as saveMembers,
  MEMBER_EMOJIS,
} from "@/lib/store";

interface Props {
  members: Member[];
  onUpdate: (m: Member[]) => void;
}

export function MemberManager({ members, onUpdate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(MEMBER_EMOJIS[0]);

  const handleAdd = () => {
    if (!name.trim()) return;
    const updated = [
      ...members,
      { id: crypto.randomUUID(), name: name.trim(), emoji },
    ];
    saveMembers(updated);
    onUpdate(updated);
    setName("");
    setEmoji(MEMBER_EMOJIS[Math.floor(Math.random() * MEMBER_EMOJIS.length)]);
    setShowAdd(false);
  };

  const handleRemove = (id: string) => {
    const updated = members.filter((m) => m.id !== id);
    saveMembers(updated);
    onUpdate(updated);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-foreground">成員名單</p>
        <Button
          variant="iosGhost"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
        >
          <UserPlus className="w-4 h-4" />
          新增
        </Button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            className="ios-card p-4 flex flex-col gap-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex gap-2 flex-wrap">
              {MEMBER_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition-all ${
                    emoji === e
                      ? "bg-ios-blue scale-110 shadow-md"
                      : "bg-secondary hover:bg-accent"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="輸入名字"
              className="h-11 rounded-xl bg-secondary px-4 text-foreground outline-none focus:ring-2 focus:ring-ios-blue transition-all"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button variant="ios" size="lg" onClick={handleAdd} disabled={!name.trim()}>
              加入成員
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {members.map((m) => (
            <motion.div
              key={m.id}
              className="flex items-center gap-1.5 bg-secondary rounded-full pl-2 pr-1 py-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
            >
              <span className="text-lg">{m.emoji}</span>
              <span className="text-sm font-medium text-foreground">{m.name}</span>
              <button
                onClick={() => handleRemove(m.id)}
                className="w-6 h-6 rounded-full hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {members.length === 0 && (
        <p className="text-center text-muted-foreground py-4 text-sm">
          請先新增成員才能開始記帳
        </p>
      )}
    </div>
  );
}
