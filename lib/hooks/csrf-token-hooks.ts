import router from "next/router";
import { useEffect, useState } from "react";

export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const res = await fetch("/api/csrf", {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          router.push("/error");
        }
        const data = await res.json();
        setCsrfToken(data.csrfToken);
      } catch {
        router.push("/error");
      }
    };
    fetchCsrfToken();
  }, []);
  return csrfToken;
}
