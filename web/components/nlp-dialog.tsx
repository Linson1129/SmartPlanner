"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Box, Button, Chip, Dialog, DialogContent, DialogTitle, IconButton, Paper, Stack, TextField, Typography,
} from "@mui/material";
import { ArrowRight, Check, Loader2, Sparkles, X } from "lucide-react";
import type { NlpDraft } from "@/lib/types";
import { EVENT_TYPE_META, PRIORITY_META } from "@/lib/types";
import { formatMonthDay, formatTime, parseDateTime } from "@/lib/dates";
import { ApiRequestError, parseSentence } from "@/lib/api";

interface NlpDialogProps {
  open: boolean;
  onClose: () => void;
  onUseDraft: (draft: NlpDraft) => void;
}

const EXAMPLES = [
  "明天下午3点和队友开会，优先级高",
  "后天晚上8点在图书馆复习2小时",
  "下周一上午10点体检",
  "明天早上坐飞机要去杭州玩",
  "今晚8点看电影",
];

export function NlpDialog({ open, onClose, onUseDraft }: NlpDialogProps) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<NlpDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setText("");
    setDraft(null);
    setError(null);
    setLoading(false);
  }, [open]);

  const parse = async (event?: FormEvent) => {
    event?.preventDefault();
    const value = text.trim();
    if (!value) {
      setError("先写一句想安排的事");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDraft(await parseSentence(value));
    } catch (parseError) {
      setError(parseError instanceof ApiRequestError ? parseError.message : "解析失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  const start = draft ? parseDateTime(draft.startAt) : null;
  const end = draft ? parseDateTime(draft.endAt) : null;

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="nlp-title">
      <DialogTitle id="nlp-title" sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <Sparkles size={20} color="var(--mui-palette-primary-main)" />
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>QUICK ADD</Typography>
            <Typography component="div" variant="h6" sx={{ fontWeight: 650 }}>一句话排期</Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} aria-label="关闭" sx={{ position: "absolute", right: 12, top: 12 }}>
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form" onSubmit={parse}>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            value={text}
            placeholder="例如：明天下午3点和队友开会，优先级高"
            onChange={(event) => { setText(event.target.value); setDraft(null); }}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: "wrap", mt: 1.25 }}>
            {EXAMPLES.map((example) => (
              <Chip key={example} label={example} size="small" variant="outlined" onClick={() => { setText(example); setDraft(null); }} />
            ))}
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 2 }}>
            <Typography variant="caption" color="text.secondary">自然语言解析为日程草稿，确认后再保存</Typography>
            <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}>
              {loading ? "正在解析…" : "解析成草稿"}
            </Button>
          </Stack>
        </Box>

        {error ? <Typography color="error" variant="body2" sx={{ mt: 2 }}>{error}</Typography> : null}

        {draft ? (
          <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: "action.hover" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                识别置信度 {Math.round(draft.confidence * 100)}%
              </Typography>
              <Stack direction="row" sx={{ gap: 0.5, flexWrap: "wrap" }}>
                {draft.matches.slice(0, 5).map((match) => <Chip key={match} label={match} size="small" />)}
              </Stack>
            </Stack>
            <Typography variant="h6" sx={{ mt: 1, fontWeight: 650 }}>{draft.title}</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", mt: 1, color: "text.secondary" }}>
              <Typography variant="body2">{start ? `${formatMonthDay(start)} ${formatTime(start)}` : "时间待定"}</Typography>
              {end ? <><ArrowRight size={12} /><Typography variant="body2">{formatMonthDay(end)} {formatTime(end)}</Typography></> : <Typography variant="body2">完成时截止</Typography>}
              <Chip size="small" label={EVENT_TYPE_META[draft.type].label} />
              <Chip size="small" label={PRIORITY_META[draft.priority].label} color={draft.priority === "HIGH" ? "warning" : "default"} />
              {draft.location ? <Typography variant="body2">@{draft.location}</Typography> : null}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mt: 2 }}>
              <Button variant="text" onClick={() => setDraft(null)}>重新输入</Button>
              <Button variant="contained" startIcon={<Check size={16} />} onClick={() => onUseDraft(draft)}>填入表单</Button>
            </Stack>
          </Paper>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
