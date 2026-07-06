import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { getNote, updateNote, toggleNoteFlag, trashNote } from "@/lib/notes.functions";
import { runNoteAction, chatWithNote, scanDocument } from "@/lib/ai.functions";
import { Window } from "@/components/desktop/Window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  Pin,
  Star,
  Archive,
  Trash2,
  ArrowLeft,
  Eye,
  Pencil,
  MessageCircle,
  Wand2,
  Loader2,
  Send,
  Paperclip,
  Image as ImageIcon,
  Video,
  Link2,
  ScanLine,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notes/$id")({
  head: () => ({ meta: [{ title: "Note — Smart Notes" }] }),
  component: NoteEditor,
});

const EMOJIS = ["📝", "💡", "⭐", "🔥", "🚀", "📚", "🎯", "❤️", "☕", "🧠", "✅", "📌", "🎨", "🌟"];

const AI_ACTIONS = [
  { id: "summarize", label: "Summarize", desc: "3-5 sentence summary" },
  { id: "key_points", label: "Key points", desc: "Bulleted highlights" },
  { id: "action_items", label: "Action items", desc: "Checklist of to-dos" },
  { id: "improve", label: "Improve writing", desc: "Clearer + cleaner" },
  { id: "explain", label: "Explain simply", desc: "Beginner-friendly" },
  { id: "title", label: "Generate title", desc: "One punchy title" },
  { id: "tone_professional", label: "Tone: Professional", desc: "Business tone" },
  { id: "tone_casual", label: "Tone: Casual", desc: "Friendly tone" },
  { id: "tone_academic", label: "Tone: Academic", desc: "Formal tone" },
] as const;

function NoteEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getNote);
  const updateFn = useServerFn(updateNote);
  const toggleFn = useServerFn(toggleNoteFlag);
  const trashFn = useServerFn(trashNote);
  const actionFn = useServerFn(runNoteAction);
  const chatFn = useServerFn(chatWithNote);
  const scanFn = useServerFn(scanDocument);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  const { data: note, isLoading, isError, error: noteError } = useQuery({
    queryKey: ["note", id],
    queryFn: () => getFn({ data: { id } }),
    retry: false,
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [aiOutput, setAiOutput] = useState<{ label: string; text: string } | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (note && !initialized.current) {
      setTitle(note.title);
      setContent(note.content);
      setEmoji(note.emoji);
      historyRef.current = [note.content];
      historyIndexRef.current = 0;
      initialized.current = true;
    }
  }, [note]);

  // Autosave
  useEffect(() => {
    if (!initialized.current || !note) return;
    if (title === note.title && content === note.content && emoji === note.emoji) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await updateFn({ data: { id, title, content, emoji } });
        setSavedAt(new Date());
        qc.invalidateQueries({ queryKey: ["notes"] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [title, content, emoji, id, note, updateFn, qc]);

  // Push to undo history
  useEffect(() => {
    if (!initialized.current) return;
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }
    const h = historyRef.current;
    const idx = historyIndexRef.current;
    if (h[idx] === content) return;
    const trimmed = h.slice(0, idx + 1);
    trimmed.push(content);
    if (trimmed.length > 50) trimmed.shift();
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
  }, [content]);

  const undo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      isRestoringRef.current = true;
      setContent(historyRef.current[historyIndexRef.current]);
    }
  };
  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      isRestoringRef.current = true;
      setContent(historyRef.current[historyIndexRef.current]);
    }
  };

  const wordCount = useMemo(() => (content.trim().match(/\S+/g) ?? []).length, [content]);
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const toggleM = useMutation({
    mutationFn: (v: { field: "is_pinned" | "is_favorite" | "is_archived"; value: boolean }) =>
      toggleFn({ data: { id, ...v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note", id] }),
  });
  const trashM = useMutation({
    mutationFn: () => trashFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Moved to trash");
      navigate({ to: "/notes" });
    },
  });

  async function runAction(actionId: string, label: string) {
    if (!content.trim()) return toast.error("Note is empty");
    setAiBusy(actionId);
    setAiOutput(null);
    try {
      const res = await actionFn({ data: { action: actionId as never, text: content } });
      if (actionId === "title") {
        setTitle(res.output.replace(/^["']|["']$/g, ""));
        toast.success("Title updated");
      } else {
        setAiOutput({ label, text: res.output });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setAiBusy(null);
    }
  }

  function insertAtCursor(text: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((c) => (c ? `${c}\n\n${text}` : text));
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("Failed to read file"));
      r.readAsDataURL(file);
    });
  }

  function toYouTubeEmbed(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Image too large (max 3MB). Use a URL instead.");
    try {
      const url = await fileToDataUrl(file);
      insertAtCursor(`\n\n![${file.name}](${url})\n\n`);
      toast.success("Photo embedded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Video too large (max 5MB). Use a URL instead.");
    try {
      const url = await fileToDataUrl(file);
      insertAtCursor(`\n\n<video controls src="${url}" style="max-width:100%;border-radius:12px"></video>\n\n`);
      toast.success("Video embedded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function onScanDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("File too large (max 8MB).");
    setScanning(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await scanFn({ data: { imageDataUrl: dataUrl } });
      insertAtCursor(`\n\n${res.output}\n\n`);
      toast.success("Document scanned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  function promptPhotoUrl() {
    const url = window.prompt("Paste image URL");
    if (!url) return;
    const alt = window.prompt("Alt text (optional)") ?? "";
    insertAtCursor(`\n\n![${alt}](${url})\n\n`);
  }

  function promptVideoUrl() {
    const url = window.prompt("Paste video URL (YouTube or direct .mp4)");
    if (!url) return;
    const yt = toYouTubeEmbed(url);
    if (yt) {
      insertAtCursor(`\n\n<iframe src="${yt}" style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px" allowfullscreen></iframe>\n\n`);
    } else {
      insertAtCursor(`\n\n<video controls src="${url}" style="max-width:100%;border-radius:12px"></video>\n\n`);
    }
  }

  function promptWebLink() {
    const url = window.prompt("Paste URL");
    if (!url) return;
    const label = window.prompt("Link text (optional)") ?? url;
    insertAtCursor(`[${label}](${url})`);
  }

  if (isError) {
    return (
      <Window title="Couldn't load note">
        <p className="text-sm text-destructive">
          {noteError instanceof Error ? noteError.message : "Something went wrong loading this note."}
        </p>
        <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={() => navigate({ to: "/notes" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to notes
        </Button>
      </Window>
    );
  }

  if (isLoading || !note) {
    return <Window title="Loading…"><p className="text-sm text-muted-foreground">Loading note…</p></Window>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Window
        title={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate({ to: "/notes" })} className="hover:text-primary" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span>Note</span>
          </div>
        }
        toolbar={
          <>
            <span className="hidden sm:inline text-[11px] text-muted-foreground">
              {saving ? "Saving…" : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : "Autosave on"}
            </span>
            <Button size="sm" variant="outline" className="rounded-full" onClick={undo} title="Undo">↶</Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={redo} title="Redo">↷</Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
            >
              {mode === "edit" ? (<><Eye className="mr-1 h-4 w-4" /> Preview</>) : (<><Pencil className="mr-1 h-4 w-4" /> Edit</>)}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setShowChat((v) => !v)}>
              <MessageCircle className="mr-1 h-4 w-4" /> Chat
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-full" disabled={scanning}>
                  {scanning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Paperclip className="mr-1 h-4 w-4" />}
                  Attach
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl w-56">
                <DropdownMenuItem onClick={() => photoInputRef.current?.click()}>
                  <ImageIcon className="mr-2 h-4 w-4" /> Upload photo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={promptPhotoUrl}>
                  <ImageIcon className="mr-2 h-4 w-4" /> Photo from URL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                  <Video className="mr-2 h-4 w-4" /> Upload video
                </DropdownMenuItem>
                <DropdownMenuItem onClick={promptVideoUrl}>
                  <Video className="mr-2 h-4 w-4" /> Video / YouTube URL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={promptWebLink}>
                  <Link2 className="mr-2 h-4 w-4" /> Web link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => scanInputRef.current?.click()} disabled={scanning}>
                  <ScanLine className="mr-2 h-4 w-4" /> Scan document (OCR)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={onPickPhoto} />
            <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={onPickVideo} />
            <input ref={scanInputRef} type="file" accept="image/*,application/pdf" hidden onChange={onScanDoc} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                  <span className="text-lg">{emoji ?? "📝"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl">
                <div className="grid grid-cols-7 gap-1 p-2 w-56">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className="text-xl rounded hover:bg-accent p-1"
                    >{e}</button>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEmoji(null)}>Clear emoji</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">⋯</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl">
                <DropdownMenuItem onClick={() => toggleM.mutate({ field: "is_pinned", value: !note.is_pinned })}>
                  <Pin className="mr-2 h-4 w-4" /> {note.is_pinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleM.mutate({ field: "is_favorite", value: !note.is_favorite })}>
                  <Star className="mr-2 h-4 w-4" /> {note.is_favorite ? "Unfavorite" : "Favorite"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleM.mutate({ field: "is_archived", value: !note.is_archived })}>
                  <Archive className="mr-2 h-4 w-4" /> {note.is_archived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => trashM.mutate()} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Move to trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="border-0 shadow-none px-0 text-2xl sm:text-3xl font-bold focus-visible:ring-0 mb-2"
        />
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-muted-foreground">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{readingTime} min read</span>
          {note.is_pinned && <Badge variant="secondary" className="rounded-full">Pinned</Badge>}
          {note.is_favorite && <Badge variant="secondary" className="rounded-full">Favorite</Badge>}
          {note.is_archived && <Badge variant="outline" className="rounded-full">Archived</Badge>}
        </div>

        {mode === "edit" ? (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing... Markdown supported (# heading, **bold**, - list, - [ ] task, `code`). Use Attach for photos, videos, links & document scan."
            className="min-h-[420px] font-mono text-sm border-0 shadow-none px-0 focus-visible:ring-0 resize-none"
          />
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert min-h-[420px]">
            {content.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview yet.</p>
            )}
          </div>
        )}

        {aiOutput && (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Sparkles className="h-4 w-4 text-primary" /> {aiOutput.label}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="rounded-full h-7" onClick={() => setContent((c) => `${c}\n\n${aiOutput.text}`)}>Insert</Button>
                <Button size="sm" variant="ghost" className="rounded-full h-7" onClick={() => setContent(aiOutput.text)}>Replace</Button>
                <Button size="sm" variant="ghost" className="rounded-full h-7" onClick={() => setAiOutput(null)}>Close</Button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiOutput.text}</ReactMarkdown>
            </div>
          </div>
        )}
      </Window>

      <div className="space-y-4">
        <Window title="AI Actions">
          <div className="space-y-1.5">
            {AI_ACTIONS.map((a) => (
              <button
                key={a.id}
                disabled={!!aiBusy}
                onClick={() => runAction(a.id, a.label)}
                className={cn(
                  "w-full text-left rounded-xl border border-border/60 bg-card/70 px-3 py-2 transition hover:bg-accent",
                  aiBusy === a.id && "opacity-70",
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {aiBusy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 text-primary" />}
                  {a.label}
                </div>
                <div className="text-[11px] text-muted-foreground">{a.desc}</div>
              </button>
            ))}
          </div>
        </Window>

        {showChat && <ChatPanel content={content} chatFn={chatFn} />}
      </div>
    </div>
  );
}

function ChatPanel({ content, chatFn }: { content: string; chatFn: ReturnType<typeof useServerFn<typeof chatWithNote>> }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await chatFn({ data: { noteContent: content, history: messages, question: q } });
      setMessages([...next, { role: "assistant", content: res.output }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Window title="Ask this note">
      <div className="max-h-72 overflow-y-auto space-y-2 mb-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Ask any question about this note.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("rounded-xl px-3 py-2 text-sm", m.role === "user" ? "bg-primary/10 ml-6" : "bg-muted mr-6")}>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> thinking…</div>}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Ask a question…"
          className="rounded-full"
        />
        <Button size="icon" onClick={send} disabled={busy} className="rounded-full shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Window>
  );
}
