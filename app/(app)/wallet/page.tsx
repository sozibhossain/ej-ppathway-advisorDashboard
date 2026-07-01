"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { useAuth } from "../../lib/auth-context";
import { fmtDate, fmtDateTime, fmtMinutes, fmtCredits, fmtCurrency } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import {
  TrendIcon,
  WalletIcon,
  TrashIcon,
  DownloadIcon,
  UploadIcon,
  ArrowLeftIcon,
  PlusIcon,
} from "../../components/Icons";
import type {
  EarningsOverview,
  TransactionDoc,
  PayoutAccountResponse,
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

  const [payout, setPayout] = useState<PayoutAccountResponse | null>(null);
  const [showPayoutMethod, setShowPayoutMethod] = useState(false);

  const loadPayout = async () => {
    try {
      const r = await api.get<PayoutAccountResponse>("/wallet/advisor/payout-account");
      setPayout(r.data || null);
    } catch {
      // ignore — payout config is best-effort
    }
  };

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
    loadPayout();
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
    if (!payout?.account.hasMethod) {
      toast.error("Add a payout method first");
      setShowWithdraw(false);
      setShowPayoutMethod(true);
      return;
    }
    setWithdrawing(true);
    try {
      await api.post("/wallet/advisor/withdraw", { credits: v });
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
    const methodLabel = t.withdrawalMethod
      ? t.withdrawalMethod.replace(/_/g, " ").replace("hyperwallet", "Hyperwallet")
      : "Hyperwallet";
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
    <tr><td class="l">Method</td><td class="r">${methodLabel}</td></tr>
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
  const rate = payout?.config.payoutCreditUsdRate ?? 1;
  const payoutCurrency = payout?.config.payoutCurrency || "USD";
  const minCredits = payout?.config.minPayoutCredits ?? 50;
  const balanceUsd = balance * rate;
  const amountUsd = (Number(amount) || 0) * rate;
  const method = payout?.account;

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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="lg" onClick={() => setShowPayoutMethod(true)}>
            <WalletIcon size={16} />
            {payout?.account.hasMethod ? "Payout Method" : "Add Payout Method"}
          </Button>
          <Button
            onClick={() => setShowWithdraw(true)}
            disabled={balance < minCredits}
            size="lg"
          >
            <UploadIcon size={16} />
            Withdraw Funds
          </Button>
        </div>
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
          <div className="text-[11px] text-slate-500 mt-1">
            ≈ {fmtCurrency(balanceUsd)} {payoutCurrency} · Minimum {minCredits} credits
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
                          <td className="px-3 py-3 text-slate-700 capitalize">
                            {(t.withdrawalMethod || method?.methodLabel || "—")
                              .replace(/_/g, " ")
                              .replace("hyperwallet", "")
                              .trim() || "—"}
                          </td>
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
          <p className="text-sm text-slate-500">
            Paid out via {method?.methodType === "paypal" ? "PayPal" : "bank transfer"} (Hyperwallet)
          </p>

          <div className="bg-sky-50 rounded-xl p-4 mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Available Balance</span>
              <span className="font-bold text-emerald-600">
                {fmtCredits(balance)} <span className="text-slate-400 font-normal">≈ {fmtCurrency(balanceUsd)}</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Minimum Withdrawal</span>
              <span className="font-bold text-slate-900">{minCredits} credits</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Payout rate</span>
              <span className="font-bold text-slate-900">{fmtCurrency(rate)} / credit</span>
            </div>
          </div>

          <label className="block mt-4">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Enter withdrawal amount (credits)
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`e.g. ${minCredits}`}
              className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0a7a90]/20 focus:border-[#0a7a90]"
              min={minCredits}
            />
            {Number(amount) > 0 && (
              <span className="block mt-1 text-xs text-slate-500">
                You will receive ≈ {fmtCurrency(amountUsd)} {payoutCurrency}
              </span>
            )}
          </label>

          <div className="mt-3">
            <div className="text-sm font-medium text-slate-700 mb-1.5">Payout account</div>
            {method?.hasMethod ? (
              <div className="bg-sky-50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded bg-white text-[#0a7a90] flex items-center justify-center">
                    {method.methodType === "paypal" ? "🅿️" : "🏦"}
                  </span>
                  <div>
                    <div className="font-medium text-slate-900">
                      {method.methodLabel || (method.methodType === "paypal" ? "PayPal" : "Bank account")}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {method.verified ? "Connected" : "Pending"} · {method.currency}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowWithdraw(false);
                  setShowPayoutMethod(true);
                }}
                className="w-full text-left bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 hover:bg-amber-100"
              >
                No payout method yet — click to add a bank account or PayPal.
              </button>
            )}
          </div>

          <Button
            onClick={onWithdraw}
            loading={withdrawing}
            disabled={!method?.hasMethod}
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

      {showPayoutMethod && (
        <PayoutMethodModal
          data={payout}
          onClose={() => setShowPayoutMethod(false)}
          onChanged={() => {
            loadPayout();
            loadOverview();
          }}
        />
      )}
    </div>
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
  const [acct, setAcct] = useState(data?.account || null);
  const [busy, setBusy] = useState<string | null>(null);
  const [methodTab, setMethodTab] = useState<"bank" | "paypal">("bank");
  const [routing, setRouting] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [purpose, setPurpose] = useState("CHECKING");
  const [paypalEmail, setPaypalEmail] = useState("");

  const refresh = async () => {
    try {
      const r = await api.get<PayoutAccountResponse>("/wallet/advisor/payout-account");
      setAcct(r.data?.account || null);
    } catch {
      // ignore
    }
    onChanged();
  };

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      await refresh();
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const setup = () =>
    run("setup", () => api.post("/wallet/advisor/payout-account/setup", {}), "Payout account ready");

  const addBank = async () => {
    if (!routing || !accountNo) {
      toast.error("Enter routing and account number");
      return;
    }
    const ok = await run(
      "bank",
      () =>
        api.post("/wallet/advisor/payout-account/bank", {
          branchId: routing,
          bankAccountId: accountNo,
          bankAccountPurpose: purpose,
        }),
      "Bank account added"
    );
    if (ok) {
      setRouting("");
      setAccountNo("");
    }
  };

  const addPaypal = async () => {
    if (!paypalEmail) {
      toast.error("Enter your PayPal email");
      return;
    }
    const ok = await run(
      "paypal",
      () => api.post("/wallet/advisor/payout-account/paypal", { email: paypalEmail }),
      "PayPal added"
    );
    if (ok) setPaypalEmail("");
  };

  const removeMethod = () =>
    run("remove", () => api.delete("/wallet/advisor/payout-account/method"), "Payout method removed");

  return (
    <Modal open onClose={onClose} title="Payout Method" size="md">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">
          Add where you want to receive payouts. Your earned credits are converted to{" "}
          {data?.config.payoutCurrency || "USD"} at{" "}
          {fmtCurrency(data?.config.payoutCreditUsdRate ?? 1)} per credit.
        </p>

        {!acct?.configured ? (
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-600 mb-3">
              Set up your payout account to add a bank account or PayPal.
            </div>
            <Button loading={busy === "setup"} onClick={setup}>
              <PlusIcon size={16} /> Set up payout account
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                    Active payout method
                  </div>
                  {acct.hasMethod ? (
                    <div className="font-medium text-slate-900">
                      {acct.methodType === "paypal" ? "🅿️ " : "🏦 "}
                      {acct.methodLabel || acct.methodType} · {acct.currency}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">No method attached yet.</div>
                  )}
                </div>
                {acct.hasMethod && (
                  <Button variant="ghost" size="sm" loading={busy === "remove"} onClick={removeMethod}>
                    <TrashIcon size={15} /> Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 inline-flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setMethodTab("bank")}
                  className={`px-3 h-8 rounded-md text-xs font-medium ${methodTab === "bank" ? "bg-white shadow-sm" : "text-slate-500"}`}
                >
                  Bank account
                </button>
                <button
                  onClick={() => setMethodTab("paypal")}
                  className={`px-3 h-8 rounded-md text-xs font-medium ${methodTab === "paypal" ? "bg-white shadow-sm" : "text-slate-500"}`}
                >
                  PayPal
                </button>
              </div>

              {methodTab === "bank" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Routing number (ABA)"
                    value={routing}
                    onChange={(e) => setRouting(e.target.value)}
                    placeholder="021000021"
                  />
                  <Input
                    label="Account number"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    placeholder="1234567890"
                  />
                  <Select label="Account type" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                  </Select>
                  <div className="flex items-end">
                    <Button className="w-full" loading={busy === "bank"} onClick={addBank}>
                      Save bank account
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="PayPal email"
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <div className="flex items-end">
                    <Button className="w-full" loading={busy === "paypal"} onClick={addPaypal}>
                      Save PayPal
                    </Button>
                  </div>
                </div>
              )}
              <p className="mt-3 text-[11px] text-slate-400">
                Adding a new method replaces your current active payout method.
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
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
