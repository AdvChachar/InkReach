'use client';

import { useState, useRef, useEffect } from "react";
import { APP_CONFIG } from "@/config/client";
import { useBook } from "@/context/book-context";
import { trackEvent } from "@/lib/analytics";
import { DownloadButton } from "@/components/ui/output-card";
import { RefreshCw, Mail, Users, Loader2, Send, Rocket } from "lucide-react";
import { getGeneratedContent } from "@/lib/generated-content";
import { getManuscriptAnalysis } from "@/lib/manuscript";
import { getContacts, addContacts, addContact, removeContact, parseCSV, type Contact } from "@/lib/contacts";
import { buildEmailHtml, parseEmailSequence, type ParsedEmail } from "@/lib/email-template";
import { toast } from "sonner";

export function EmailSequence() {
  const { activeBook } = useBook();
  const book = activeBook;
  const bookId = book?.id || "";
  const generated = getGeneratedContent(bookId);
  const analysis = getManuscriptAnalysis(bookId);
  const existingEmail = generated?.items.find((i) => i.type === "email");
  const [bookTitle, setBookTitle] = useState<string>(book?.title ?? analysis?.title ?? APP_CONFIG.bookTitle);
  const [launchDate, setLaunchDate] = useState("");
  const [readerAvatar, setReaderAvatar] = useState(analysis?.targetReader ?? book?.targetReader ?? APP_CONFIG.targetReader);
  const [tropes, setTropes] = useState<string>(((analysis?.tropes || []).join(", ") || book?.bookTropes) ?? APP_CONFIG.bookTropes);
  const [output, setOutput] = useState(existingEmail?.content || "");
  const [loading, setLoading] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResults, setSendResults] = useState<string[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const authorName = book?.authorName ?? analysis?.author ?? APP_CONFIG.authorName;
  const [editableEmails, setEditableEmails] = useState<ParsedEmail[]>([]);

  useEffect(() => {
    setContacts(getContacts());
  }, []);

  useEffect(() => {
    if (output) setEditableEmails(parseEmailSequence(output));
  }, [output]);

  const handleEmailEdit = (index: number, field: "subject" | "body", value: string) => {
    setEditableEmails((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setOutput("");
    setSendResults([]);
    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle,
          authorName,
          launchDate,
          readerAvatar,
          tropes,
          bookBlurb: (analysis?.blurb || book?.bookBlurb) ?? APP_CONFIG.bookBlurb,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setOutput(`❌ ${data.error}`);
      } else {
        setOutput(data.content);
        trackEvent("generate_email", bookTitle);
      }
    } catch {
      setOutput("⚠️ Connection failed. Check your internet and try again.");
    }
    setLoading(false);
  };

  const handleAddContact = () => {
    if (!newEmail.includes("@")) return;
    const updated = addContact({ email: newEmail, name: newName || newEmail.split("@")[0] });
    setContacts(updated);
    setNewEmail("");
    setNewName("");
    toast.success("Contact added");
  };

  const handleRemoveContact = (email: string) => {
    const updated = removeContact(email);
    setContacts(updated);
    toast.success("Contact removed");
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error("No valid contacts found in CSV");
        return;
      }
      const updated = addContacts(parsed);
      setContacts(updated);
      toast.success(`${parsed.length} contacts imported`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendOneEmail = async (to: string, name: string, email: ParsedEmail): Promise<string> => {
    const html = buildEmailHtml(email.subject, email.body, authorName, bookTitle);
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject: email.subject,
        html,
        from: `${APP_CONFIG.emailSenderName} <${APP_CONFIG.emailSenderAddress}>`,
        campaign: `launch-${bookTitle.replace(/\s+/g, "-").toLowerCase()}`,
      }),
    });
    const data = await res.json();
    if (data.error) return `❌ ${name} (${to}): ${data.error}`;
    return `✅ ${name} (${to}): ${email.subject}`;
  };

  const handleSendTest = async () => {
    if (!testEmail.includes("@") || editableEmails.length === 0) return;
    setTestLoading(true);
    const results: string[] = [];
    for (const email of editableEmails) {
      const r = await sendOneEmail(testEmail, "Test Reader", email);
      results.push(r);
    }
    setSendResults(results);
    setTestLoading(false);
    toast.success(`Test sent to ${testEmail}`);
    trackEvent("email_sent", bookTitle, { count: editableEmails.length, type: "test" });
  };

  const handleSendToList = async () => {
    if (contacts.length === 0 || editableEmails.length === 0) return;
    setSendLoading(true);
    setSendResults([]);
    const total = contacts.length * editableEmails.length;
    let completed = 0;
    const results: string[] = [];
    for (const contact of contacts) {
      for (const email of editableEmails) {
        const r = await sendOneEmail(contact.email, contact.name, email);
        results.push(r);
        completed++;
      }
    }
    setSendResults(results);
    setSendLoading(false);
    toast.success(`Sent ${completed}/${total} emails`);
    trackEvent("email_sent", bookTitle, { count: completed, type: "bulk" });
  };

  return (
    <div className="space-y-6">
      <p className="text-foreground text-sm">
        Generate a 3-email launch sequence: teaser, launch day, and social proof.
        Then send them to your readers.
      </p>

      {output && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">
          ✅ Email sequence pre-generated from your manuscript
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Book Title</label>
          <input
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted font-medium">Launch Date</label>
          <input
            type="date"
            value={launchDate}
            onChange={(e) => setLaunchDate(e.target.value)}
            className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted font-medium">Reader Avatar</label>
        <input
          value={readerAvatar}
          onChange={(e) => setReaderAvatar(e.target.value)}
          placeholder={analysis?.targetReader || "e.g. Women 25-45 who love emotionally intense romance"}
          className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted font-medium">Tropes</label>
        <input
          value={tropes}
          onChange={(e) => setTropes(e.target.value)}
          className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-accent text-white font-semibold rounded-lg px-4 py-2 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "⏳ Generating..." : output ? <><RefreshCw className="w-4 h-4 inline-block mr-1.5" />Regenerate Email Sequence</> : <><Mail className="w-4 h-4 inline-block mr-1.5" />Generate Email Sequence</>}
      </button>

      {output && (
        <div className="space-y-4">
          <div className="space-y-2">
            {editableEmails.length > 0 ? (
              editableEmails.map((email, i) => (
                <details key={i} className="bg-card border border-accent-dim rounded-xl overflow-hidden">
                  <summary className="px-5 py-3 cursor-pointer font-medium text-accent hover:bg-accent/5 transition-colors">
                    {email.subject || "No subject"}
                  </summary>
                  <div className="px-5 py-4 space-y-3 border-t border-accent-dim">
                    <div className="space-y-1">
                      <label className="text-xs text-muted font-medium">Subject Line</label>
                      <input
                        value={email.subject}
                        onChange={(e) => handleEmailEdit(i, "subject", e.target.value)}
                        className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted font-medium">Email Body</label>
                      <textarea
                        value={email.body}
                        onChange={(e) => handleEmailEdit(i, "body", e.target.value)}
                        rows={8}
                        className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent font-mono resize-y"
                      />
                    </div>
                    <div className="text-xs text-muted">
                      Signed as: <span className="text-foreground">{authorName}</span> &mdash; <em>{bookTitle}</em>
                    </div>
                  </div>
                </details>
              ))
            ) : (
              <div className="output-card">{output}</div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <DownloadButton content={output} filename="email_sequence.txt" label="Download TXT" />
          </div>

          <div className="border border-accent-dim rounded-xl overflow-hidden">
            <button
              onClick={() => setShowContacts(!showContacts)}
              className="w-full px-5 py-3 flex items-center justify-between bg-card hover:bg-accent/5 transition-colors"
            >
              <span className="font-medium text-foreground inline-flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Contacts ({contacts.length})
              </span>
              <span className="text-muted text-sm">{showContacts ? "▲" : "▼"}</span>
            </button>

            {showContacts && (
              <div className="px-5 py-4 space-y-4 border-t border-accent-dim">
                <div className="flex gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
                  />
                  <input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email"
                    className="flex-1 bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
                  />
                  <button
                    onClick={handleAddContact}
                    disabled={!newEmail.includes("@")}
                    className="bg-accent text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-40 hover:bg-accent/90 transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-accent hover:underline"
                  >
                    + Import from CSV (name,email per line)
                  </button>
                </div>

                {contacts.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {contacts.map((c) => (
                      <div key={c.email} className="flex items-center justify-between bg-card/50 rounded-lg px-3 py-2 text-sm">
                        <span className="text-foreground">{c.name} &lt;{c.email}&gt;</span>
                        <button
                          onClick={() => handleRemoveContact(c.email)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="flex-1 min-w-[200px] bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
            />
            <button
              onClick={handleSendTest}
              disabled={testLoading || !testEmail.includes("@") || editableEmails.length === 0}
              className="bg-card border border-accent text-accent font-medium rounded-lg px-4 py-2 text-sm hover:bg-accent/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {testLoading ? <><Loader2 className="w-4 h-4 inline-block mr-1.5 animate-spin" />Sending...</> : <><Send className="w-4 h-4 inline-block mr-1.5" />Send Test</>}
            </button>
            <button
              onClick={handleSendToList}
              disabled={sendLoading || contacts.length === 0 || editableEmails.length === 0}
              className="bg-accent text-white font-semibold rounded-lg px-4 py-2 text-sm transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sendLoading
                ? <><Loader2 className="w-4 h-4 inline-block mr-1.5 animate-spin" />Sending...</>
                : <><Rocket className="w-4 h-4 inline-block mr-1.5" />Send to {contacts.length} Contact{contacts.length !== 1 ? "s" : ""}</>
              }
            </button>
          </div>

          {sendResults.length > 0 && (
            <div className="bg-card border border-accent-dim rounded-xl p-4 space-y-1 max-h-48 overflow-y-auto">
              <p className="text-sm font-medium text-foreground mb-2">Send Results</p>
              {sendResults.map((r, i) => (
                <p key={i} className="text-xs">{r}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
