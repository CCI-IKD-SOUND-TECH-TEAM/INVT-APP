"use client";

import { useState, useTransition } from "react";
import { useStore, type MutationResult } from "@/lib/store";
import { inviteUser, requestSignIn } from "@/app/actions/auth";
import type { Profile } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Modal from "@/components/Modal";
import { IconCheck as CheckIcon, IconMail as EnvelopeIcon, IconAlertTriangle as ExclamationTriangleIcon, IconKey as KeyIcon, IconPencil as PencilSquareIcon, IconPlus as PlusIcon, IconTrash as TrashIcon, IconX as XMarkIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
        profiles={store.profiles}
        onSent={(name, kind) => {
          store.logAccessEmail(name, kind);
          flash(
            kind === "invite"
              ? `Invite sent to ${name}.`
              : `Sign-in link sent to ${name}.`
          );
        }}
        onError={(message) => flash(message, "bad")}
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

/**
 * Sign-in is passwordless, so there is no password to reset. Each row offers
 * whichever email actually helps that person: an invite for staff who have
 * never signed in, a fresh sign-in link for everyone else.
 */
function UserAccounts({
  profiles,
  onSent,
  onError,
}: {
  profiles: Profile[];
  onSent: (name: string, kind: "invite" | "sign-in") => void;
  onError: (message: string) => void;
}) {
  const [target, setTarget] = useState<Profile | null>(null);
  const [pending, startTransition] = useTransition();

  // Never signed in -> they need an account created, not a link.
  const kindFor = (p: Profile): "invite" | "sign-in" =>
    p.last_login_at ? "sign-in" : "invite";

  function send(profile: Profile) {
    const kind = kindFor(profile);
    startTransition(async () => {
      const result =
        kind === "invite"
          ? await inviteUser(profile.email, profile.full_name)
          : await requestSignIn(profile.email);

      setTarget(null);
      if (result.ok) onSent(profile.full_name, kind);
      else onError(result.error);
    });
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>User Accounts</CardTitle>
        <span className="text-xs text-ink-faint">
          {profiles.length} accounts · equal access
        </span>
      </CardHeader>
      <div className="flex flex-col">
        {profiles.map((profile, idx) => {
          const kind = kindFor(profile);
          return (
            <div
              key={profile.id}
              className={cn(
                "flex items-center justify-between gap-4 border-t border-line-subtle py-3",
                idx === 0 && "border-t-0 pt-0"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar>
                  <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <strong className="truncate text-sm font-bold">
                    {profile.full_name}
                  </strong>
                  <span className="truncate text-xs text-ink-faint">
                    {profile.email}
                    {kind === "invite" && " · never signed in"}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => setTarget(profile)}
              >
                {kind === "invite" ? (
                  <>
                    <EnvelopeIcon className="size-3.5" /> Send Invite
                  </>
                ) : (
                  <>
                    <KeyIcon className="size-3.5" /> Send Sign-in Link
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {target && (
        <Modal
          title={
            kindFor(target) === "invite" ? "Send invite?" : "Send sign-in link?"
          }
          onClose={() => setTarget(null)}
        >
          <p className="text-muted-foreground">
            {kindFor(target) === "invite" ? (
              <>
                We&apos;ll email{" "}
                <strong className="text-foreground">{target.email}</strong> a
                welcome message with a code to get started. There&apos;s no
                password to set up.
              </>
            ) : (
              <>
                We&apos;ll email{" "}
                <strong className="text-foreground">{target.email}</strong> a
                fresh 6-digit code and sign-in link. It expires in 10 minutes.
              </>
            )}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setTarget(null)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={() => send(target)}>
              {pending
                ? "Sending…"
                : kindFor(target) === "invite"
                  ? "Send Invite"
                  : "Send Link"}
            </Button>
          </div>
        </Modal>
      )}
    </Card>
  );
}
