"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { useAuth } from "../../lib/auth-context";
import { fmtDate, fmtDateTime, fmtMinutes, fmtCredits } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import {
  TrendIcon,
  WalletIcon,
  TrashIcon,
  DownloadIcon,
  UploadIcon,
  ArrowLeftIcon,
} from "../../components/Icons";
import type {
  EarningsOverview,
  TransactionDoc,
} from "../../lib/types";

type Range = "all" | "today" | "week" | "month";

export default function WalletPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [overview, setOverview] = useState<EarningsOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [tab, setTab] = useState<"earnings" | "withdrawals">("earnings");
  const [range, setRange] = useState<Range>("all");
  const [items, setItems] = useState<TransactionDoc[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 5;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<TransactionDoc | null>(
    null
  );
  const [delLoading, setDelLoading] = useState(false);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const r = await api.get<EarningsOverview>("/wallet/advisor/overview");
      setOverview(r.data || null);
    } catch {
      // ignore
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadTab = async () => {
    setLoadingTab(true);
    try {
      const path =
        tab === "earnings"
          ? "/wallet/advisor/earnings"
          : "/wallet/advisor/withdrawals";
      const q: Record<string, string | number> = { page, limit };
      if (tab === "earnings" && range !== "all") q.range = range;
      const r = await api.get<TransactionDoc[]>(path, q);
      setItems(r.data || []);
      setTotal(r.meta?.total || 0);
      setSelected(new Set());
    } catch {
      // ignore
    } finally {
      setLoadingTab(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    loadTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, range, page]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total]
  );

  const onWithdraw = async () => {
    const v = Number(amount);
    if (!v || v <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setWithdrawing(true);
    try {
      await api.post("/wallet/advisor/withdraw", { amount: v });
      toast.success("Withdrawal requested — payouts processed in 2-5 days");
      setShowWithdraw(false);
      setAmount("");
      loadOverview();
      if (tab === "withdrawals") loadTab();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Withdraw failed");
    } finally {
      setWithdrawing(false);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    setDelLoading(true);
    try {
      const path =
        tab === "earnings"
          ? `/wallet/advisor/earnings/${confirmDelete._id}`
          : `/wallet/advisor/withdrawals/${confirmDelete._id}`;
      await api.delete(path);
      toast.success("Removed from history");
      setConfirmDelete(null);
      loadTab();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setDelLoading(false);
    }
  };

  const onBulkDelete = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const base =
      tab === "earnings"
        ? "/wallet/advisor/earnings"
        : "/wallet/advisor/withdrawals";
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => api.delete(`${base}/${id}`))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const ok = results.length - failed;
      if (ok > 0) toast.success(`${ok} removed from history`);
      if (failed > 0) toast.error(`${failed} could not be removed`);
      setConfirmBulk(false);
      setSelected(new Set());
      loadTab();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bulk delete failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const downloadInvoice = (t: TransactionDoc) => {
    const advisorName = user?.name || "Advisor";
    const id = `INV-${t._id.slice(-6).toUpperCase()}`;
    const date = fmtDateTime(t.createdAt);
    const amount = fmtCredits(t.amount);
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${id}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;padding:32px;max-width:720px;margin:auto}
h1{margin:0 0 4px 0;font-size:24px}
.muted{color:#64748b;font-size:12px}
.box{border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-top:24px}
table{width:100%;border-collapse:collapse;margin-top:16px}
td{padding:8px 0;font-size:14px}
td.l{color:#64748b;width:40%}
td.r{font-weight:600;text-align:right}
.total{border-top:1px solid #e2e8f0;font-size:16px;color:#dc2626}
</style></head>
<body>
<h1>Withdrawal Invoice</h1>
<div class="muted">${id} &middot; ${date}</div>
<div class="box">
  <table>
    <tr><td class="l">Advisor</td><td class="r">${advisorName}</td></tr>
    <tr><td class="l">Transaction ID</td><td class="r">${t._id}</td></tr>
    <tr><td class="l">Type</td><td class="r">Withdrawal</td></tr>
    <tr><td class="l">Method</td><td class="r">Stripe</td></tr>
    <tr><td class="l">Status</td><td class="r">${t.withdrawalStatus || t.status || "—"}</td></tr>
    <tr><td class="l">Date</td><td class="r">${date}</td></tr>
    <tr class="total"><td class="l">Amount</td><td class="r">- ${amount}</td></tr>
  </table>
</div>
<div class="muted" style="margin-top:24px">Prophetic Pathway &middot; Generated ${new Date().toLocaleString()}</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const curve = (overview?.revenueCurve || []).reduce(
    (acc, c) => {
      acc[c._id] = c.total;
      return acc;
    },
    {} as Record<number, number>
  );
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const values = [2, 3, 4, 5, 6, 7, 1].map((d) => curve[d] || 0);
  const max = Math.max(...values, 1);
  const peakIdx = values.indexOf(max);

  const balance = overview?.wallet?.earningsBalance || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Earnings Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and manage your professional income.
          </p>
        </div>
        <Button
          onClick={() => setShowWithdraw(true)}
          disabled={balance < 50}
          size="lg"
        >
          <UploadIcon size={16} />
          Withdraw Funds
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-sky-50 rounded-2xl border border-sky-100 p-5">
          <div className="flex items-start justify-between">
            <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#0a7a90]">
              <WalletIcon size={22} />
            </div>
            <div className="h-10 w-10 rounded-full bg-[#0a7a90] text-white flex items-center justify-center">
              $
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-3">Available Balance</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">
            {fmtCredits(balance)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 inline-flex items-center gap-1">
            <span className="text-slate-400">$</span>
            Minimum Withdrawal Amount - ($50)
          </div>

          <div className="grid grid-cols-1 gap-2 mt-4">
            <div className="bg-white rounded-xl p-3">
              <div className="text-xs text-slate-600">Today's Earnings</div>
              <div className="text-emerald-600 font-bold text-xl mt-1">
                +{fmtCredits(overview?.todayEarnings || 0)}
              </div>
            </div>
            <div className="bg-white rounded-xl p-3">
              <div className="text-xs text-slate-600">Today's Withdrawals</div>
              <div className="text-red-600 font-bold text-xl mt-1">
                -{fmtCredits(overview?.todayWithdrawals || 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Daily Revenue</h3>
            <div className="flex items-center gap-2 text-xs">
              <Badge2
                icon={<DownloadIcon size={12} />}
                label="Total Earnings"
                value={fmtCredits(overview?.grossEarnings || 0)}
              />
              <Badge2
                icon={<UploadIcon size={12} />}
                label="Total Withdraw"
                value={fmtCredits(overview?.totalWithdrawn || 0)}
              />
              <span className="px-3 h-7 inline-flex items-center rounded-lg bg-slate-100 text-slate-700 font-medium">
                Weekly
              </span>
            </div>
          </div>

          {loadingOverview ? (
            <div className="h-56 flex items-end gap-3 px-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-t-lg"
                  style={{ height: `${30 + ((i * 13) % 60)}%` }}
                />
              ))}
            </div>
          ) : (
            <div className="h-56 flex items-end gap-3 px-3">
              {values.map((v, i) => {
                const h = (v / max) * 100;
                const isPeak = i === peakIdx;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div
                      className={`w-full rounded-t-lg ${isPeak ? "bg-[#0a7a90]" : "bg-slate-100"}`}
                      style={{ height: `${Math.max(8, h)}%`, minHeight: 16 }}
                    />
                    <div className="text-[10px] text-slate-500">{labels[i]}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-bold text-slate-900">Transactions History</h2>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 text-xs">
            {(["all", "today", "week", "month"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 h-8 rounded-md font-medium ${
                  range === r
                    ? "bg-[#0a7a90] text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {r === "all"
                  ? "All Time"
                  : r === "today"
                    ? "Today"
                    : r === "week"
                      ? "This Week"
                      : "This Month"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 mt-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setTab("earnings");
              setPage(1);
            }}
            className={`h-11 rounded-xl border font-semibold ${
              tab === "earnings"
                ? "bg-[#0a7a90] text-white border-[#0a7a90]"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Earnings History
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("withdrawals");
              setPage(1);
            }}
            className={`h-11 rounded-xl border font-semibold ${
              tab === "withdrawals"
                ? "bg-[#0a7a90] text-white border-[#0a7a90]"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Withdrawals History
          </button>
        </div>

        {tab === "earnings" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <SummaryStat
              tone="sky"
              icon={<DownloadIcon size={16} />}
              label="Gross Earnings"
              value={fmtCredits(overview?.grossEarnings || 0)}
              chip="+ 20%"
            />
            <SummaryStat
              tone="rose"
              icon={<TrendIcon size={16} />}
              label="Platform fee"
              value={fmtCredits(overview?.platformFee || 0)}
              chip="-20% Commission"
            />
            <SummaryStat
              tone="emerald"
              icon={<TrendIcon size={16} />}
              label="Net Earnings"
              value={fmtCredits(overview?.netEarnings || 0)}
              chip="+ 14%"
            />
          </div>
        )}

        {selected.size > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm">
              <span className="font-semibold">{selected.size}</span> Selected ·{" "}
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-[#0a7a90] hover:underline"
              >
                Deselect all
              </button>
            </div>
            <button
              type="button"
              onClick={() => setConfirmBulk(true)}
              aria-label="Remove selected from history"
              title="Remove selected from history"
              className="h-9 w-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
            >
              <TrashIcon size={16} />
            </button>
          </div>
        )}

        <div className="overflow-x-auto -mx-5 mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                <th className="px-5 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelected(new Set(items.map((i) => i._id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                {tab === "earnings" ? (
                  <>
                    <th className="px-3 py-3 text-left font-semibold">User</th>
                    <th className="px-3 py-3 text-left font-semibold">Type</th>
                    <th className="px-3 py-3 text-left font-semibold">
                      Duration
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">
                      Date & Time
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">
                      Earned
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-3 text-left font-semibold">Type</th>
                    <th className="px-3 py-3 text-left font-semibold">
                      Date & Time
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">
                      Earned
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">
                      Withdrawal method
                    </th>
                  </>
                )}
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingTab ? (
                Array.from({ length: 5 }).map((_, r) => (
                  <tr key={r} className="border-b border-slate-50 last:border-0">
                    {Array.from({ length: 7 }).map((_, c) => (
                      <td key={c} className="px-5 py-4">
                        <Skeleton className="h-3 w-full max-w-25" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-slate-500 text-sm"
                  >
                    No records yet
                  </td>
                </tr>
              ) : (
                items.map((t) => {
                  const u =
                    typeof t.user === "object"
                      ? t.user
                      : { name: "—", profilePhoto: undefined };
                  const ses = typeof t.session === "object" ? t.session : undefined;
                  const sel = selected.has(t._id);
                  return (
                    <tr
                      key={t._id}
                      className={`border-b border-slate-100 ${
                        sel ? "bg-amber-50" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleSelect(t._id)}
                        />
                      </td>
                      {tab === "earnings" ? (
                        <>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar
                                name={u.name}
                                src={u.profilePhoto}
                                size={28}
                              />
                              <span className="font-medium text-slate-900">
                                {u.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 capitalize text-slate-700">
                            {ses?.type || "—"}
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {ses?.durationMinutes
                              ? fmtMinutes(ses.durationMinutes)
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {fmtDateTime(t.createdAt)}
                          </td>
                          <td className="px-3 py-3 font-semibold text-emerald-600">
                            +{fmtCredits(t.amount)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 text-slate-700">
                            Withdrawal
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {fmtDateTime(t.createdAt)}
                          </td>
                          <td className="px-3 py-3 font-semibold text-red-600">
                            -{fmtCredits(t.amount)}
                          </td>
                          <td className="px-3 py-3 text-slate-700">Stripe</td>
                        </>
                      )}
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(t)}
                            className="h-8 w-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
                          >
                            <TrashIcon size={14} />
                          </button>
                          {tab === "earnings" ? null : (
                            <button
                              type="button"
                              onClick={() => downloadInvoice(t)}
                              className="text-[#0a7a90] hover:underline inline-flex items-center gap-1 text-xs font-semibold"
                            >
                              Download invoice
                              <DownloadIcon size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-slate-500">
            Showing {(page - 1) * limit + (items.length ? 1 : 0)} to{" "}
            {(page - 1) * limit + items.length} of {total} results
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ‹
            </Button>
            <span className="px-3 text-sm bg-[#0a7a90] text-white rounded-lg h-8 inline-flex items-center font-semibold">
              {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              ›
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={onDelete}
        title="Are you sure?"
        description="Want to delete this record from history. If deleted it will not show again on your dashboard."
        confirmText="Delete"
        danger
        loading={delLoading}
      />

      <ConfirmDialog
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        onConfirm={onBulkDelete}
        title={`Remove ${selected.size} record${selected.size === 1 ? "" : "s"}?`}
        description="The selected records will no longer appear in your history."
        confirmText="Remove"
        danger
        loading={bulkLoading}
      />

      <Modal open={showWithdraw} onClose={() => setShowWithdraw(false)} hideClose size="sm">
        <div className="text-left">
          <button
            type="button"
            onClick={() => setShowWithdraw(false)}
            className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-3 hover:bg-slate-200"
          >
            <ArrowLeftIcon size={16} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Withdraw Funds</h2>
          <p className="text-sm text-slate-500">Paid out via Stripe Connect</p>

          <div className="bg-sky-50 rounded-xl p-4 mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Available Balance</span>
              <span className="font-bold text-emerald-600">
                {fmtCredits(balance)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Minimum Withdrawal</span>
              <span className="font-bold text-slate-900">$50.00</span>
            </div>
          </div>

          <label className="block mt-4">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Enter withdrawal amount
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100"
              className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0a7a90]/20 focus:border-[#0a7a90]"
              min={50}
            />
          </label>

          <div className="mt-3">
            <div className="text-sm font-medium text-slate-700 mb-1.5">
              Stripe connect account
            </div>
            <div className="bg-sky-50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded bg-white text-[#0a7a90] flex items-center justify-center">
                  💳
                </span>
                <div>
                  <div className="font-medium text-slate-900">
                    Stripe — {user?.email}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {user?.stripeConnectVerified
                      ? "Connected · verified"
                      : "Connection pending"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={onWithdraw}
            loading={withdrawing}
            className="w-full mt-4"
            size="lg"
          >
            Withdraw
          </Button>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            Payouts processed within 2-5 business days
          </p>
        </div>
      </Modal>
    </div>
  );
}

function SummaryStat({
  tone,
  icon,
  label,
  value,
  chip,
}: {
  tone: "sky" | "rose" | "emerald";
  icon: React.ReactNode;
  label: string;
  value: string;
  chip: string;
}) {
  const cls: Record<string, string> = {
    sky: "bg-sky-50 border-sky-100",
    rose: "bg-rose-50 border-rose-100",
    emerald: "bg-emerald-50 border-emerald-100",
  };
  const chipCls: Record<string, string> = {
    sky: "bg-white text-sky-700",
    rose: "bg-white text-rose-700",
    emerald: "bg-white text-emerald-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${cls[tone]}`}>
      <div className="flex items-start justify-between">
        <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center text-slate-700">
          {icon}
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${chipCls[tone]}`}
        >
          <TrendIcon size={10} className="inline-block mr-1" />
          {chip}
        </span>
      </div>
      <div className="text-sm text-slate-600 mt-2">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function Badge2({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 h-7 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
      {icon}
      <span className="text-slate-500 font-normal">{label}</span>
      <span className="font-bold">{value}</span>
    </span>
  );
}
