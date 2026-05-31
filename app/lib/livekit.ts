"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
  type LocalTrackPublication,
} from "livekit-client";
import { api } from "./api";

export type LiveKitTokenResponse = {
  token: string;
  url: string;
  roomName?: string;
};

export type LiveKitStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

type Options = {
  /** session id used to fetch the access token */
  sessionId: string | undefined;
  /** "video" publishes camera + mic, "call" publishes mic only */
  mode: "video" | "call";
  /** only connect once the session is actually live */
  enabled: boolean;
};

/**
 * Connects to the LiveKit room for a session and exposes simple controls.
 * Works against LiveKit Cloud or a self-hosted server (URL comes from the backend token endpoint).
 */
export function useLiveKitSession({ sessionId, mode, enabled }: Options) {
  const roomRef = useRef<Room | null>(null);
  const localVideoEl = useRef<HTMLVideoElement | null>(null);
  const remoteVideoEl = useRef<HTMLVideoElement | null>(null);

  const [status, setStatus] = useState<LiveKitStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(mode === "video");
  const [remotePresent, setRemotePresent] = useState(false);

  // Ref callbacks so the parent can hand us the <video> elements.
  const setLocalVideoEl = useCallback((el: HTMLVideoElement | null) => {
    localVideoEl.current = el;
    attachLocalVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setRemoteVideoEl = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoEl.current = el;
    attachRemoteVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attachLocalVideo = useCallback(() => {
    const room = roomRef.current;
    const el = localVideoEl.current;
    if (!room || !el) return;
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    const track = pub?.videoTrack;
    if (track) track.attach(el);
  }, []);

  const attachRemoteVideo = useCallback(() => {
    const room = roomRef.current;
    const el = remoteVideoEl.current;
    if (!room || !el) return;
    for (const participant of room.remoteParticipants.values()) {
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack && !pub.isMuted) {
        pub.videoTrack.attach(el);
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const refreshRemote = () => {
      const present = Array.from(room.remoteParticipants.values()).length > 0;
      setRemotePresent(present);
      attachRemoteVideo();
    };

    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video) {
          if (remoteVideoEl.current) track.attach(remoteVideoEl.current);
        } else if (track.kind === Track.Kind.Audio) {
          // Audio elements are created + appended by LiveKit and autoplay.
          track.attach();
        }
        refreshRemote();
      })
      .on(
        RoomEvent.TrackUnsubscribed,
        (track: RemoteTrack, _pub: RemoteTrackPublication) => {
          track.detach();
          refreshRemote();
        }
      )
      .on(RoomEvent.LocalTrackPublished, (pub: LocalTrackPublication) => {
        if (pub.track?.kind === Track.Kind.Video) attachLocalVideo();
      })
      .on(RoomEvent.ParticipantConnected, (_p: RemoteParticipant) =>
        refreshRemote()
      )
      .on(RoomEvent.ParticipantDisconnected, () => refreshRemote())
      .on(RoomEvent.Reconnecting, () => setStatus("reconnecting"))
      .on(RoomEvent.Reconnected, () => setStatus("connected"))
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) setStatus("idle");
      });

    (async () => {
      try {
        setStatus("connecting");
        setError(null);
        const r = await api.post<LiveKitTokenResponse>(
          `/sessions/${sessionId}/livekit-token`
        );
        const data = r.data;
        if (!data?.token || !data?.url) {
          throw new Error("Missing LiveKit access token");
        }
        if (cancelled) return;
        await room.connect(data.url, data.token);
        if (cancelled) {
          await room.disconnect();
          return;
        }
        await room.localParticipant.setMicrophoneEnabled(true);
        if (mode === "video") {
          await room.localParticipant.setCameraEnabled(true);
        }
        setMicEnabled(true);
        setCamEnabled(mode === "video");
        setStatus("connected");
        attachLocalVideo();
        refreshRemote();
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Connection failed");
      }
    })();

    return () => {
      cancelled = true;
      room.disconnect().catch(() => {});
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionId, mode]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  }, [micEnabled]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !camEnabled;
    await room.localParticipant.setCameraEnabled(next);
    setCamEnabled(next);
    if (next) attachLocalVideo();
  }, [camEnabled, attachLocalVideo]);

  const disconnect = useCallback(async () => {
    await roomRef.current?.disconnect().catch(() => {});
  }, []);

  return {
    status,
    error,
    micEnabled,
    camEnabled,
    remotePresent,
    setLocalVideoEl,
    setRemoteVideoEl,
    toggleMic,
    toggleCamera,
    disconnect,
  };
}
