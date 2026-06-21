import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const router = useRouter();

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
          router.push("/result/error");
        }
        const data = await res.json();
        setCsrfToken(data.csrfToken);
      } catch {
        router.push("/result/error");
      }
    };
    fetchCsrfToken();
  }, [router]);
  return csrfToken;
}
