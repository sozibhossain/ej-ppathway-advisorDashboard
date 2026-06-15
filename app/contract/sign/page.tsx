"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { CheckIcon } from "../../components/Icons";
import { apiRequest, api, ApiError } from "../../lib/api";

type ContractDetails = {
  applicantName: string;
  contractUrl: string;
  signed: boolean;
  signedAt: string | null;
};

type Status = "loading" | "error" | "signed" | "ready" | "success";
type SignMode = "draw" | "type";

const BRAND = "#0a7a90";
const SIGNATURE_FONT = "'Dancing Script', cursive";

const PAGE_BG = "min-h-screen bg-gradient-to-b from-[#f0f9fb] to-[#eaf6f9] py-8 sm:py-12";
const CARD =
  "mx-auto w-full max-w-3xl bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-300/40";

function Logo() {
  return (
    <Image
      src="/logo.png"
      alt="Prophetic Pathway"
      width={170}
      height={44}
      priority
      className="h-10 w-auto mx-auto object-contain"
    />
  );
}

function StatePage({ children }: { children: React.ReactNode }) {
  return (
    <section className={`${PAGE_BG} flex items-center`}>
      <div className="w-full px-4">
        <div className={`${CARD} p-8 text-center`}>{children}</div>
      </div>
    </section>
  );
}

export default function ContractSignPage() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [details, setDetails] = useState<ContractDetails | null>(null);
  const [loadError, setLoadError] = useState("");

  // Form state
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [mode, setMode] = useState<SignMode>("draw");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [signedAt, setSignedAt] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Read the token from the URL (avoid useSearchParams / Suspense requirement).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
    if (!t) {
      setStatus("error");
      setLoadError("Invalid or missing signing link");
    }
  }, []);

  // Fetch contract details once we have a token.
  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const res = await apiRequest<ContractDetails>("/contracts/details", {
          method: "GET",
          query: { token },
          skipAuth: true,
        });
        if (!active) return;
        const data = res.data;
        if (!data) {
          setStatus("error");
          setLoadError("This signing link is invalid or has expired.");
          return;
        }
        setDetails(data);
        setSignerName(data.applicantName || "");
        if (data.signed) {
          setSignedAt(data.signedAt);
          setStatus("signed");
        } else {
          setStatus("ready");
        }
      } catch (err) {
        if (!active) return;
        setStatus("error");
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "This signing link is invalid or has expired."
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  // --- Draw signature pad --------------------------------------------------
  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = pointFromEvent(e);
    lastPoint.current = p;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = BRAND;
    ctx.fill();
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = getCtx();
    const from = lastPoint.current;
    if (!ctx || !from) return;
    const to = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = BRAND;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPoint.current = to;
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer may already be released */
    }
  };

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    lastPoint.current = null;
  }, []);

  // Render the typed name onto an offscreen canvas in a signature font, so the
  // backend receives the same PNG data-URL shape as the drawn signature.
  const buildTypedSignature = async (name: string): Promise<string | null> => {
    const text = name.trim();
    if (!text) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Best-effort: wait for the web font so the export isn't a fallback glyph.
    try {
      await document.fonts.load(`64px ${SIGNATURE_FONT}`);
      await document.fonts.ready;
    } catch {
      /* font load is best-effort */
    }
    let size = 72;
    ctx.fillStyle = BRAND;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    // Shrink to fit the width.
    do {
      ctx.font = `${size}px ${SIGNATURE_FONT}`;
      if (ctx.measureText(text).width <= canvas.width - 40) break;
      size -= 4;
    } while (size > 20);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL("image/png");
  };

  // --- Submit --------------------------------------------------------------
  const hasSignature = mode === "draw" ? hasDrawn : !!signerName.trim();
  const canSubmit = !!signerName.trim() && hasSignature && agreed && !submitting;

  const submit = async () => {
    if (!token || !details) return;
    setSubmitError("");
    if (!canSubmit) return;

    let signatureImage: string | null = null;
    if (mode === "draw") {
      signatureImage = canvasRef.current?.toDataURL("image/png") ?? null;
    } else {
      signatureImage = await buildTypedSignature(signerName);
    }
    if (!signatureImage) {
      setSubmitError("Please add your signature before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ signedAt: string; alreadySigned?: boolean }>(
        "/contracts/sign",
        { token, signerName: signerName.trim(), signatureImage, agreed: true },
        { skipAuth: true }
      );
      setSignedAt(res.data?.signedAt ?? new Date().toISOString());
      setStatus("success");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "We couldn't sign the contract. Please try again."
      );
      setSubmitting(false);
    }
  };

  // --- Render --------------------------------------------------------------
  if (status === "loading") {
    return (
      <StatePage>
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#0a7a90]/30 border-t-[#0a7a90] animate-spin" />
        <p className="mt-4 text-slate-600">Loading your contract…</p>
      </StatePage>
    );
  }

  if (status === "error") {
    return (
      <StatePage>
        <Logo />
        <h1 className="mt-5 text-2xl font-bold text-[#0a7a90]">Link Not Available</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          {loadError || "Invalid or missing signing link"}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Please use the most recent link from your email, or contact our team for a new one.
        </p>
      </StatePage>
    );
  }

  if (status === "signed") {
    return (
      <StatePage>
        <Logo />
        <div className="mx-auto mt-5 h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 inline-flex items-center justify-center">
          <CheckIcon size={30} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#0a7a90]">Already Signed</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          This advisor contract has already been signed
          {signedAt ? ` on ${formatDate(signedAt)}` : ""}. No further action is needed.
        </p>
        {details?.contractUrl ? (
          <a
            href={details.contractUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block text-sm font-semibold text-[#0a7a90] hover:underline"
          >
            Open contract in a new tab
          </a>
        ) : null}
      </StatePage>
    );
  }

  if (status === "success") {
    return (
      <StatePage>
        <Logo />
        <div className="mx-auto mt-5 h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 inline-flex items-center justify-center">
          <CheckIcon size={30} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#0a7a90]">Contract Signed</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Thank you, {signerName.trim() || details?.applicantName}. Your advisor contract has been
          signed successfully
          {signedAt ? ` on ${formatDate(signedAt)}` : ""}. A copy will be kept on file, and our team
          will follow up with the next steps for your onboarding.
        </p>
        {details?.contractUrl ? (
          <a
            href={details.contractUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block text-sm font-semibold text-[#0a7a90] hover:underline"
          >
            Open contract in a new tab
          </a>
        ) : null}
      </StatePage>
    );
  }

  // status === "ready"
  return (
    <section className={PAGE_BG}>
      {/* Self-host-free signature font; loaded once and hoisted to <head>. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap"
      />
      <div className="w-full px-4">
        <div className={`${CARD} p-6 sm:p-8 md:p-10`}>
          <div className="text-center">
            <Logo />
            <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-[#0a7a90]">
              Sign Your Advisor Contract
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
              Please review the agreement below, then add your full legal name and signature to
              complete the signing.
            </p>
          </div>

          {/* Contract PDF — inline preview */}
          <div className="mt-7">
            <iframe
              src={details?.contractUrl}
              className="w-full h-[55vh] rounded-xl border border-slate-200"
              title="Contract"
            />
            {details?.contractUrl ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  If the contract doesn&apos;t appear above, open it in a new tab.
                </span>
                <a
                  href={details.contractUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-semibold text-[#0a7a90] hover:underline"
                >
                  Open contract in a new tab
                </a>
              </div>
            ) : null}
          </div>

          {/* Sign form */}
          <div className="mt-8 space-y-6">
            <Input
              label="Full legal name"
              placeholder="Your full legal name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              autoComplete="name"
              maxLength={120}
            />

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">Signature</span>
                {/* Draw / Type tabs */}
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                  {(["draw", "type"] as SignMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        mode === m
                          ? "bg-white text-[#0a7a90] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {m === "draw" ? "Draw" : "Type"}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "draw" ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={200}
                      aria-label="Signature pad — draw your signature here"
                      className="w-full h-44 touch-none cursor-crosshair block"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={endStroke}
                      onPointerLeave={endStroke}
                      onPointerCancel={endStroke}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {hasDrawn ? "Draw or re-sign above." : "Draw your signature in the box above."}
                    </span>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-sm font-medium text-[#0a7a90] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white h-44 flex items-center justify-center px-4 overflow-hidden">
                    {signerName.trim() ? (
                      <span
                        className="text-[#0a7a90] leading-none text-center break-words"
                        style={{ fontFamily: SIGNATURE_FONT, fontSize: "3rem" }}
                      >
                        {signerName.trim()}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">
                        Type your full legal name above to generate your signature.
                      </span>
                    )}
                  </div>
                  <span className="mt-2 block text-xs text-slate-500">
                    Your typed name will be used as your electronic signature.
                  </span>
                </>
              )}
            </div>

            <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0a7a90] focus:ring-[#0a7a90]/30"
              />
              I have read and agree to the terms of this contract.
            </label>

            {submitError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}

            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={submit}
              loading={submitting}
              disabled={!canSubmit}
            >
              {submitting ? "Signing…" : "Sign Contract"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
