import dfsBalanceAtom from "@/atoms/dfsBalanceAtom";
import DataForSEO from "@/services/DataForSEO";
import useDFSCredentials from "@/hooks/useDFSCredentials";
import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";

export default function useDFSBalance(refreshBalance: boolean = false) {
  const [currentDFSBalance, setDFSBalance] = useAtom(dfsBalanceAtom);
  const { credentials } = useDFSCredentials();

  const refreshDFSBalance = useCallback(async () => {
    if (!credentials?.username || !credentials?.password) return;

    const DataForSEOService = new DataForSEO(
      credentials.username,
      credentials.password,
    );
    const dfsBalance = await DataForSEOService.getAccountBalance();

    if (typeof dfsBalance === "number") setDFSBalance(dfsBalance);
  }, [credentials, setDFSBalance]);

  useEffect(() => {
    if (refreshBalance && credentials) refreshDFSBalance();
  }, [refreshDFSBalance, refreshBalance, credentials]);

  return { currentDFSBalance, refreshDFSBalance };
}
