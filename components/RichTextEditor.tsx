"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Describe what's included…",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "max-w-none focus:outline-none min-h-[100px] px-3 py-2",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // keep editor content in sync if the parent resets `value` externally
  useEffect(() => {
    if (editor && value !== editor.getHTML() && document.activeElement?.closest(".rte-wrapper") === null) {
      editor.commands.setContent(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `text-xs px-2 py-1 rounded font-medium ${active ? "bg-brand-100 text-brand-700" : "text-ink/50 hover:bg-black/5"}`;

  return (
    <div className="rte-wrapper input !p-0 overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b border-black/[0.06] px-2 py-1.5 bg-black/[0.015]">
        <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
        <span className="w-px bg-black/10 mx-1" />
        <button
          type="button"
          className={btn(false)}
          onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}
        >
          + Table
        </button>
        {editor.isActive("table") && (
          <>
            <button type="button" className={btn(false)} onClick={() => editor.chain().focus().addColumnAfter().run()}>+Col</button>
            <button type="button" className={btn(false)} onClick={() => editor.chain().focus().addRowAfter().run()}>+Row</button>
            <button type="button" className={btn(false)} onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</button>
          </>
        )}
      </div>
      <EditorContent editor={editor} className="rte-content" />
    </div>
  );
}
