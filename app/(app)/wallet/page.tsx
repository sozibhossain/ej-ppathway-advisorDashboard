"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { fmtDateTime, fmtMinutes } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Combobox } from "../../components/ui/Combobox";
import { Skeleton } from "../../components/ui/Skeleton";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { HyperwalletDropInButton } from "../../components/payout/HyperwalletDropInButton";
import { useCountries } from "../../lib/countries";
import { WalletIcon, TrashIcon } from "../../components/Icons";
import type { PayoutAccountResponse, TransactionDoc } from "../../lib/types";

type Range = "all" | "today" | "week" | "month";
type Tab = "services" | "payouts";

const serviceLabel = (type?: string) => {
  if (type === "call") return "Audio call";
  if (type === "video") return "Video call";
  if (type === "chat") return "Text chat";
  return "Service";
};

export default function WalletPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "withdrawals" ? "payouts" : "services",
  );
  const [range, setRange] = useState<Range>("all");
  const [items, setItems] = useState<TransactionDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<TransactionDoc | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [payout, setPayout] = useState<PayoutAccountResponse | null>(null);
  const [showPayoutMethod, setShowPayoutMethod] = useState(false);
  const limit = 8;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);
  const method = payout?.account;

  const loadPayout = async () => {
    try {
      const r = await api.get<PayoutAccountResponse>("/wallet/advisor/payout-account");
      setPayout(r.data || null);
    } catch {
      // Payout setup is best-effort for this page.
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const path = tab === "services" ? "/wallet/advisor/earnings" : "/wallet/advisor/withdrawals";
      const query: Record<string, string | number> = { page, limit };
      if (tab === "services" && range !== "all") query.range = range;
      const r = await api.get<TransactionDoc[]>(path, query);
      setItems(r.data || []);
      setTotal(r.meta?.total || 0);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const queryTab = searchParams.get("tab");
    setTab(queryTab === "withdrawals" ? "payouts" : "services");
  }, [searchParams]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, range, page]);

  const deleteRecord = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      const base = tab === "services" ? "/wallet/advisor/earnings" : "/wallet/advisor/withdrawals";
      await api.delete(`${base}/${confirmDelete._id}`);
      toast.success("Removed from history");
      setConfirmDelete(null);
      loadHistory();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your payout destination and review your service history.
          </p>
        </div>
        <Button variant="outline" size="lg" onClick={() => setShowPayoutMethod(true)}>
          <WalletIcon size={16} />
          {method?.hasMethod ? "Payout Method" : "Add Payout Method"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1">
          <div className="mb-2 text-sm font-semibold text-slate-900">Payout destination</div>
          {method?.hasMethod ? (
            <div className="rounded-xl bg-sky-50 p-4">
              <div className="font-semibold text-slate-900">
                {method.methodLabel || (method.methodType === "paypal" ? "PayPal" : "Bank account")}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {method.verified ? "Connected" : "Pending verification"}
                {method.currency ? ` · ${method.currency}` : ""}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Add a bank account or PayPal destination so admins can send approved payouts.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="mb-2 text-sm font-semibold text-slate-900">Payout process</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ProcessStep title="1. Complete services" text="Your completed sessions are recorded in service history." />
            <ProcessStep title="2. Admin reviews" text="Admins review payout details and approve payable work." />
            <ProcessStep title="3. Receive payout" text="Approved payouts are sent to your connected destination." />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm min-[460px]:w-auto">
            <button
              type="button"
              onClick={() => {
                setTab("services");
                setPage(1);
              }}
              className={`h-9 rounded-md px-3 font-semibold ${
                tab === "services" ? "bg-[#0a7a90] text-white" : "text-slate-600 hover:bg-white"
              }`}
            >
              Service History
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("payouts");
                setPage(1);
              }}
              className={`h-9 rounded-md px-3 font-semibold ${
                tab === "payouts" ? "bg-[#0a7a90] text-white" : "text-slate-600 hover:bg-white"
              }`}
            >
              Payout History
            </button>
          </div>

          {tab === "services" ? (
            <div className="grid w-full grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1 text-xs min-[520px]:w-auto">
              {(["all", "today", "week", "month"] as Range[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRange(r);
                    setPage(1);
                  }}
                  className={`h-8 rounded-md px-2 font-medium ${
                    range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                  }`}
                >
                  {r === "all" ? "All" : r === "today" ? "Today" : r === "week" ? "Week" : "Month"}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                {tab === "services" ? (
                  <>
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Service</th>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                    <th className="px-4 py-3 font-semibold">Date & Time</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 font-semibold">Payout</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Date & Time</th>
                  </>
                )}
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, row) => (
                  <tr key={row} className="border-b border-slate-100">
                    {Array.from({ length: 5 }).map((__, col) => (
                      <td key={col} className="px-4 py-4">
                        <Skeleton className="h-3 w-full max-w-32" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    No records yet
                  </td>
                </tr>
              ) : (
                items.map((item) =>
                  tab === "services" ? (
                    <ServiceRow key={item._id} item={item} onDelete={() => setConfirmDelete(item)} />
                  ) : (
                    <PayoutRow key={item._id} item={item} onDelete={() => setConfirmDelete(item)} />
                  ),
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="text-xs text-slate-500">
            Showing {(page - 1) * limit + (items.length ? 1 : 0)} to {(page - 1) * limit + items.length} of {total}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Prev
            </Button>
            <span className="inline-flex h-8 items-center rounded-lg bg-[#0a7a90] px-3 text-sm font-semibold text-white">
              {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteRecord}
        title="Remove record?"
        description="The selected record will no longer appear in this history view."
        confirmText="Remove"
        danger
        loading={deleteLoading}
      />

      {showPayoutMethod ? (
        <PayoutMethodModal
          data={payout}
          onClose={() => setShowPayoutMethod(false)}
          onChanged={loadPayout}
        />
      ) : null}
    </div>
  );
}

function ProcessStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{text}</div>
    </div>
  );
}

function ServiceRow({ item, onDelete }: { item: TransactionDoc; onDelete: () => void }) {
  const client = typeof item.user === "object" ? item.user : undefined;
  const session = typeof item.session === "object" ? item.session : undefined;
  const isTip = item.type === "advisor_tip";
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar name={client?.name || "Client"} src={client?.profilePhoto} size={28} />
          <span className="font-medium text-slate-900">{client?.name || "Client"}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-700">
        <div className="font-medium">{isTip ? "Tip" : serviceLabel(session?.type)}</div>
        {session?.sessionCode ? <div className="text-xs text-slate-400">{session.sessionCode}</div> : null}
      </td>
      <td className="px-4 py-3 text-slate-600">{session?.durationMinutes ? fmtMinutes(session.durationMinutes) : "-"}</td>
      <td className="px-4 py-3 text-slate-600">{fmtDateTime(item.createdAt)}</td>
      <td className="px-4 py-3 text-right">
        <IconButton onClick={onDelete} />
      </td>
    </tr>
  );
}

function PayoutRow({ item, onDelete }: { item: TransactionDoc; onDelete: () => void }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 font-medium text-slate-900">{item.description || "Advisor payout"}</td>
      <td className="px-4 py-3 capitalize text-slate-600">
        {(item.withdrawalMethod || "Payout method").replace(/_/g, " ")}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
          {item.withdrawalStatus || item.status}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">{fmtDateTime(item.createdAt)}</td>
      <td className="px-4 py-3 text-right">
        <IconButton onClick={onDelete} />
      </td>
    </tr>
  );
}

function IconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove from history"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"
    >
      <TrashIcon size={14} />
    </button>
  );
}

function PayoutMethodModal({
  data,
  onClose,
  onChanged,
}: {
  data: PayoutAccountResponse | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const countries = useCountries();
  const [acct, setAcct] = useState(data?.account || null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState(data?.advisor?.dateOfBirth || "");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState(data?.advisor?.city || "");
  const [stateProvince, setStateProvince] = useState(data?.advisor?.state || "");
  const [country, setCountry] = useState(data?.advisor?.country || "US");
  const [postalCode, setPostalCode] = useState("");

  useEffect(() => {
    setDateOfBirth((value) => value || data?.advisor?.dateOfBirth || "");
    setCity((value) => value || data?.advisor?.city || "");
    setStateProvince((value) => value || data?.advisor?.state || "");
    setCountry((value) => value || data?.advisor?.country || "US");
  }, [data?.advisor]);

  const refresh = async () => {
    const r = await api.get<PayoutAccountResponse>("/wallet/advisor/payout-account");
    if (r.data?.account) setAcct(r.data.account);
    onChanged();
  };

  const payoutProfile = () => ({
    dateOfBirth,
    addressLine1,
    city,
    stateProvince,
    country,
    postalCode,
  });

  const run = async (label: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(label);
    try {
      await fn();
      toast.success(success);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open onClose={onClose} title="Set up payouts" size="lg">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">
          Connect a payout destination so approved payouts can be sent to your bank account or PayPal.
        </p>

        {!acct?.configured ? (
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-800">Payout profile</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Date of birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              <Input label="Address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Street address" />
              <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
              <Input label="State / Province" value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Country</span>
                <Combobox
                  options={countries.map((c) => ({ value: c.iso2, label: c.name }))}
                  value={country}
                  onChange={setCountry}
                  placeholder="Select country"
                  searchPlaceholder="Search country"
                />
              </label>
              <Input label="Postal code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <Button
              className="mt-4"
              loading={busy === "setup"}
              onClick={() => run("setup", () => api.post("/wallet/advisor/payout-account/setup", payoutProfile()), "Payout profile ready")}
            >
              Create payout profile
            </Button>
          </div>
        ) : (
          <div className="rounded-xl bg-sky-50 p-4">
            <div className="text-sm font-semibold text-slate-800">Active payout profile</div>
            <div className="mt-1 text-sm text-slate-600">
              {acct.methodLabel || (acct.hasMethod ? "Payout method connected" : "No destination selected")}
            </div>
          </div>
        )}

        {acct?.configured ? (
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-800">
              {acct.hasMethod ? "Change payout destination" : "Choose payout destination"}
            </div>
            <HyperwalletDropInButton
              tokenPath="/wallet/advisor/payout-account/drop-in-token"
              syncPath="/wallet/advisor/payout-account/sync-method"
              label={acct.hasMethod ? "Change payout method" : "Choose payout method"}
              onConnected={async () => {
                await refresh();
              }}
            />
          </div>
        ) : null}

        {acct?.hasMethod ? (
          <Button
            variant="danger"
            loading={busy === "remove"}
            onClick={() => run("remove", () => api.delete("/wallet/advisor/payout-account/method"), "Payout method removed")}
          >
            Remove payout method
          </Button>
        ) : null}
      </div>
    </Modal>
  );
}
