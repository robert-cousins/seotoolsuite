"use client";

import { atom } from "jotai";

export interface DFSCredentials {
  username: string;
  password: string;
  base64?: string;
  source: "environment" | "localStorage";
}

const dfsCredentialsAtom = atom<DFSCredentials | null>(null);

export default dfsCredentialsAtom;
