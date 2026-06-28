import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plan } from '../services/api';

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
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('architext_history').then((raw) => {
      if (raw) setHistory(JSON.parse(raw));
    });
  }, []);

  const addToHistory = useCallback(async (plan: Plan, description: string) => {
    const sqft = plan.rooms.reduce((s, r) => s + Math.round((r.w / 10) * (r.h / 10)), 0);
    const entry: HistoryEntry = {
      id: Date.now(),
      title: plan.title,
      description: description.slice(0, 70),
      rooms: plan.rooms.length,
      sqft,
      svg: plan.svg,
      explanation: plan.explanation || [],
      time: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      plan,
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 30);
      AsyncStorage.setItem('architext_history', JSON.stringify(next));
      return next;
    });
  }, []);

  return { history, addToHistory };
}

export function useSaved() {
  const [saved, setSaved] = useState<SavedEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('architext_saved').then((raw) => {
      if (raw) setSaved(JSON.parse(raw));
    });
  }, []);

  const savePlan = useCallback(async (plan: Plan) => {
    const entry: SavedEntry = {
      id: Date.now(),
      title: plan.title,
      rooms: plan.rooms.length,
      svg: plan.svg,
      time: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setSaved((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      AsyncStorage.setItem('architext_saved', JSON.stringify(next));
      return next;
    });
  }, []);

  return { saved, savePlan };
}
