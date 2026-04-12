"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "在这里写下你对这款游戏的评测..." }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] px-4 py-3 text-sm leading-relaxed text-foreground/90 focus:outline-none prose prose-invert prose-sm max-w-none",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-border rounded-md bg-[var(--bg-input)] overflow-hidden focus-within:border-neon-cyan transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
        <ToolButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="B" bold />
        <ToolButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="I" italic />
        <ToolButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="S" strike />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2" />
        <ToolButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="H3" />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="•" />
        <ToolButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="1." />
        <ToolButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="❝" />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolButton({ active, onClick, label, bold, italic, strike }: {
  active: boolean;
  onClick: () => void;
  label: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer
        ${active ? "bg-neon-cyan/20 text-neon-cyan" : "text-text-secondary hover:text-foreground hover:bg-white/5"}
        ${bold ? "font-bold" : ""} ${italic ? "italic" : ""} ${strike ? "line-through" : ""}`}
    >
      {label}
    </button>
  );
}
