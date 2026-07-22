import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plan } from "../services/api";

export interface HistoryEntry {
  id: number;
  title: string;
  description: string;
  rooms: number;
  sqft: number;
  svg: string;
  explanation: string[];
  time: string;
  plan?: Plan;
}

export interface SavedEntry {
  id: number;
  title: string;
  rooms: number;
  svg: string;
  time: string;
  plan?: Plan;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const loadHistory = useCallback(() => {
    AsyncStorage.getItem("architext_history").then((raw) => {
      setHistory(raw ? JSON.parse(raw) : []);
    });
  }, []);

  useFocusEffect(loadHistory);

  const addToHistory = useCallback(async (plan: Plan, description: string) => {
    const sqft = plan.rooms.reduce(
      (s, r) => s + Math.round((r.w / 10) * (r.h / 10)),
      0,
    );
    const entry: HistoryEntry = {
      id: Date.now(),
      title: plan.title,
      description: description.slice(0, 70),
      rooms: plan.rooms.length,
      sqft,
      svg: plan.svg,
      explanation: plan.explanation || [],
      time: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      plan,
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 30);
      AsyncStorage.setItem("architext_history", JSON.stringify(next));
      return next;
    });
  }, []);

  return { history, addToHistory };
}

export function useSaved() {
  const [saved, setSaved] = useState<SavedEntry[]>([]);

  const loadSaved = useCallback(() => {
    AsyncStorage.getItem("architext_saved").then((raw) => {
      setSaved(raw ? JSON.parse(raw) : []);
    });
  }, []);

  useFocusEffect(loadSaved);

  const savePlan = useCallback(async (plan: Plan) => {
    const entry: SavedEntry = {
      id: Date.now(),
      title: plan.title,
      rooms: plan.rooms.length,
      svg: plan.svg,
      time: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      // Store the full plan (rooms array, adjacencies, explanation) so a
      // reloaded saved plan can rebuild the 3D view and layout-decisions
      // panel, not just the 2D SVG. Mirrors HistoryEntry's existing
      // pattern above — svg/rooms/time above stay as-is for the list
      // display, plan carries everything HomeScreen's reload needs.
      plan,
    };
    setSaved((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      AsyncStorage.setItem("architext_saved", JSON.stringify(next));
      return next;
    });
  }, []);

  return { saved, savePlan };
}
