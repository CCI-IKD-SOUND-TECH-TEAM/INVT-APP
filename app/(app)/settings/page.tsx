"use client";

import { useState } from "react";
import { useStore, type MutationResult } from "@/lib/store";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Modal from "@/components/Modal";
import { IconCheck as CheckIcon, IconAlertTriangle as ExclamationTriangleIcon, IconKey as KeyIcon, IconPencil as PencilSquareIcon, IconPlus as PlusIcon, IconTrash as TrashIcon, IconX as XMarkIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// first.last@… — handles single- and multi-word names.
function emailFor(name: string) {
  const parts = name.trim().toLowerCase().split(/\s+/);
  const local =
    parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
  return `${local}@ccikorodu.org`;
}

type Toast = { message: string; tone: "good" | "bad" } | null;

export default function SettingsPage() {
  const store = useStore();
  const [toast, setToast] = useState<Toast>(null);

  function flash(message: string, tone: "good" | "bad" = "good") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2600);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="h-headline">Settings</h1>
        <p className="mt-1.5 text-muted-foreground">
          Manage categories, units of measure, and the five user accounts. Every
          change here is written to the audit trail.
        </p>
      </div>

      <TaxonomyManager
        title="Manage Categories"
        noun="Category"
        terms={store.categories}
        usage={store.categoryUsage}
        add={store.addCategory}
        rename={store.renameCategory}
        remove={store.deleteCategory}
        onToast={flash}
      />

      <TaxonomyManager
        title="Manage Units of Measure"
        noun="Unit"
        terms={store.units}
        usage={store.unitUsage}
        add={store.addUnit}
        rename={store.renameUnit}
        remove={store.deleteUnit}
        onToast={flash}
      />

      <UserAccounts
        users={store.users}
        onReset={(name) => {
          store.resetUserPassword(name);
          flash(`Password reset link issued to ${name}.`);
        }}
      />

      {toast && (
        <div
          role="status"
          className={cn(
            "fixed right-6 bottom-6 z-50 flex items-center gap-2.5 rounded-md border bg-popover px-4 py-3 text-sm font-bold",
            toast.tone === "good"
              ? "border-status-good text-status-good"
              : "border-brand text-brand"
          )}
        >
          {toast.tone === "good" ? (
            <CheckIcon className="size-4" />
          ) : (
            <ExclamationTriangleIcon className="size-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}

function TaxonomyManager({
  title,
  noun,
  terms,
  usage,
  add,
  rename,
  remove,
  onToast,
}: {
  title: string;
  noun: string;
  terms: string[];
  usage: (name: string) => number;
  add: (name: string) => MutationResult;
  rename: (from: string, to: string) => MutationResult;
  remove: (name: string) => MutationResult;
  onToast: (message: string, tone?: "good" | "bad") => void;
}) {
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState("");
  const [addError, setAddError] = useState("");

  const [editingTerm, setEditingTerm] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = add(addDraft);
    if ("error" in res) {
      setAddError(res.error);
    } else {
      onToast(`${noun} "${addDraft.trim()}" added.`);
      setAddDraft("");
      setAddError("");
      setAdding(false);
    }
  }

  function startEdit(term: string) {
    setEditingTerm(term);
    setEditDraft(term);
    setEditError("");
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTerm) return;
    const res = rename(editingTerm, editDraft);
    if ("error" in res) {
      setEditError(res.error);
    } else {
      if (editDraft.trim() !== editingTerm)
        onToast(`Renamed to "${editDraft.trim()}".`);
      setEditingTerm(null);
    }
  }

  const deleteUsage = deleteTarget ? usage(deleteTarget) : 0;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {!adding && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setAdding(true);
              setAddDraft("");
              setAddError("");
            }}
          >
            <PlusIcon className="size-3.5" /> Add
          </Button>
        )}
      </CardHeader>

      {adding && (
        <form onSubmit={submitAdd} className="flex flex-col gap-2" noValidate>
          <Label htmlFor={`add-${noun}`} className="sr-only">
            New {noun.toLowerCase()} name
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={`add-${noun}`}
              autoFocus
              value={addDraft}
              maxLength={40}
              aria-invalid={Boolean(addError)}
              placeholder={`New ${noun.toLowerCase()} name`}
              className="min-w-0 flex-1"
              onChange={(e) => {
                setAddDraft(e.target.value);
                setAddError("");
              }}
              onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
            />
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
          {addError && (
            <span className="field-error">
              <ExclamationTriangleIcon className="size-[13px]" /> {addError}
            </span>
          )}
        </form>
      )}

      <div className="flex flex-col">
        {terms.map((term, idx) => {
          const count = usage(term);
          const isEditing = editingTerm === term;
          return (
            <div
              key={term}
              className={cn(
                "flex items-center justify-between gap-3 border-t border-line-subtle py-3",
                idx === 0 && !adding && "border-t-0 pt-0"
              )}
            >
              {isEditing ? (
                <form
                  onSubmit={submitEdit}
                  className="flex flex-1 flex-col gap-2"
                  noValidate
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor={`edit-${term}`} className="sr-only">
                      Rename {term}
                    </Label>
                    <Input
                      id={`edit-${term}`}
                      autoFocus
                      value={editDraft}
                      maxLength={40}
                      aria-invalid={Boolean(editError)}
                      className="min-w-0 flex-1"
                      onChange={(e) => {
                        setEditDraft(e.target.value);
                        setEditError("");
                      }}
                      onKeyDown={(e) =>
                        e.key === "Escape" && setEditingTerm(null)
                      }
                    />
                    <Button type="submit" size="icon-sm" aria-label="Save name">
                      <CheckIcon className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Cancel rename"
                      onClick={() => setEditingTerm(null)}
                    >
                      <XMarkIcon className="size-3.5" />
                    </Button>
                  </div>
                  {editError && (
                    <span className="field-error">
                      <ExclamationTriangleIcon className="size-[13px]" />{" "}
                      {editError}
                    </span>
                  )}
                </form>
              ) : (
                <>
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-sm">{term}</span>
                    <span className="shrink-0 text-xs text-ink-faint tabular-nums">
                      {count === 0
                        ? "unused"
                        : `${count} item${count === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Rename ${term}`}
                      onClick={() => startEdit(term)}
                    >
                      <PencilSquareIcon className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${term}`}
                      onClick={() => setDeleteTarget(term)}
                    >
                      <TrashIcon className="size-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {terms.length === 0 && (
          <p className="py-3 text-sm text-ink-faint">
            No {noun.toLowerCase()}s yet — add one to get started.
          </p>
        )}
      </div>

      {deleteTarget && (
        <Modal
          title={
            deleteUsage > 0
              ? `Can't delete "${deleteTarget}"`
              : `Delete "${deleteTarget}"?`
          }
          onClose={() => setDeleteTarget(null)}
        >
          {deleteUsage > 0 ? (
            <>
              <p className="text-muted-foreground">
                <strong className="text-foreground">{deleteTarget}</strong> is
                still assigned to{" "}
                <strong className="text-foreground">
                  {deleteUsage} item{deleteUsage === 1 ? "" : "s"}
                </strong>
                . Rename it, or reassign those items to another{" "}
                {noun.toLowerCase()} first — nothing is deleted while it&apos;s in
                use.
              </p>
              <div className="mt-5 flex justify-end">
                <Button type="button" onClick={() => setDeleteTarget(null)}>
                  Got it
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                This {noun.toLowerCase()} isn&apos;t used by any item, so removing
                it is safe. It disappears from the inventory form immediately.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    const res = remove(deleteTarget);
                    if ("error" in res) onToast(res.error, "bad");
                    else onToast(`${noun} "${deleteTarget}" deleted.`);
                    setDeleteTarget(null);
                  }}
                >
                  Delete {noun}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </Card>
  );
}

function UserAccounts({
  users,
  onReset,
}: {
  users: string[];
  onReset: (name: string) => void;
}) {
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>User Accounts</CardTitle>
        <span className="text-xs text-ink-faint">
          {users.length} accounts · equal access
        </span>
      </CardHeader>
      <div className="flex flex-col">
        {users.map((u, idx) => (
          <div
            key={u}
            className={cn(
              "flex items-center justify-between gap-4 border-t border-line-subtle py-3",
              idx === 0 && "border-t-0 pt-0"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar>
                <AvatarFallback>{initials(u)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <strong className="truncate text-sm font-bold">{u}</strong>
                <span className="truncate text-xs text-ink-faint">
                  {emailFor(u)}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setResetTarget(u)}
            >
              <KeyIcon className="size-3.5" /> Reset Password
            </Button>
          </div>
        ))}
      </div>

      {resetTarget && (
        <Modal
          title="Reset password?"
          onClose={() => setResetTarget(null)}
        >
          <p className="text-muted-foreground">
            A password reset link will be sent to{" "}
            <strong className="text-foreground">{emailFor(resetTarget)}</strong>.
            Their current password keeps working until they set a new one.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setResetTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                onReset(resetTarget);
                setResetTarget(null);
              }}
            >
              Send Reset Link
            </Button>
          </div>
        </Modal>
      )}
    </Card>
  );
}
