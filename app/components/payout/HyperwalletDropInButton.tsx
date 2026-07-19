"use client";

import { useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Button } from "../ui/Button";

type DropInSession = {
  userToken: string;
  authenticationToken: string;
  widgetScriptUrl: string;
};

type WidgetKitDriver = {
  start: () => void;
};

type WidgetKitApi = {
  setup: (config: {
    locale: string;
    intent: "financial-instrument";
    options: { type: "INDIVIDUAL" };
    subject: { id: string };
    action: "create";
    getAccessToken: () => Promise<string>;
    onExit: (error?: string | null, data?: unknown) => void;
    onEvent: (eventType: string, data?: unknown) => void;
  }) => WidgetKitDriver;
};

declare global {
  interface Window {
    WidgetKit?: WidgetKitApi;
  }
}

let widgetScriptPromise: Promise<void> | null = null;

const loadWidgetKit = (src: string) => {
  if (window.WidgetKit) return Promise.resolve();
  if (widgetScriptPromise) return widgetScriptPromise;

  widgetScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-hyperwallet-widgetkit="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Hyperwallet secure form failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.hyperwalletWidgetkit = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Hyperwallet secure form failed to load"));
    document.head.appendChild(script);
  }).catch((error) => {
    widgetScriptPromise = null;
    throw error;
  });

  return widgetScriptPromise;
};

export function HyperwalletDropInButton({
  tokenPath,
  syncPath,
  beforeLaunch,
  onConnected,
  label = "Connect payout method",
  loadingLabel = "Opening secure form...",
  disabled = false,
}: {
  tokenPath: string;
  syncPath: string;
  beforeLaunch?: () => void | Promise<void>;
  onConnected: () => void | Promise<void>;
  label?: string;
  loadingLabel?: string;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [launching, setLaunching] = useState(false);

  const getSession = async () => {
    const response = await api.post<DropInSession>(tokenPath, {});
    if (!response.data?.userToken || !response.data.authenticationToken || !response.data.widgetScriptUrl) {
      throw new Error("Hyperwallet secure setup is unavailable");
    }
    return response.data;
  };

  const launch = async () => {
    setLaunching(true);
    try {
      await beforeLaunch?.();
      const session = await getSession();
      await loadWidgetKit(session.widgetScriptUrl);
      if (!window.WidgetKit) throw new Error("Hyperwallet secure form is unavailable");

      let initialToken = session.authenticationToken;
      const getAccessToken = async () => {
        if (initialToken) {
          const token = initialToken;
          initialToken = "";
          return token;
        }
        return (await getSession()).authenticationToken;
      };

      const finish = async (error?: string | null) => {
        setLaunching(false);
        if (error) {
          if (!String(error).toUpperCase().includes("ABORT")) {
            toast.error(String(error));
          }
          return;
        }

        try {
          await api.post(syncPath, {});
          toast.success("Payout method connected");
          await onConnected();
        } catch (syncError) {
          toast.error(syncError instanceof ApiError ? syncError.message : "Could not sync payout method");
        }
      };

      window.WidgetKit.setup({
        locale: "en",
        intent: "financial-instrument",
        options: { type: "INDIVIDUAL" },
        subject: { id: session.userToken },
        action: "create",
        getAccessToken,
        onExit: (error) => {
          void finish(error);
        },
        onEvent: () => undefined,
      }).start();
    } catch (error) {
      setLaunching(false);
      toast.error(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Could not open secure payout setup"
      );
    }
  };

  return (
    <Button type="button" loading={launching} disabled={disabled} onClick={launch}>
      {launching ? loadingLabel : label}
    </Button>
  );
}
