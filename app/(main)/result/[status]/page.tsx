import clsx from "clsx";
import { ShieldCheck } from "lucide-react";

type Status = "success" | "error";

export default async function Page({ params }: { params: Promise<{ status: Status }> }) {
  const { status } = await params;

  return <Result status={status} />;
}

function Result({ status }: { status: Status }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black">
      <div className="p-9 rounded-3xl border w-1/2 max-w-md border-white/[0.08] bg-white/[0.02]  hover:border-white/[0.12] transition-colors duration-300">
        <div className="mx-auto">
          <ShieldCheck
            size={50}
            className={clsx(
              "mx-auto mb-4",
              status === "success" ? "text-green-500" : "text-red-500"
            )}
          />
          <h1 className="text-2xl font-bold mb-4 text-center">
            {status === "success" ? "Completed Verification" : "Verification Failed"}
          </h1>
          <h1 className="text-xl font-bold mb-4 text-center">
            {status === "success" ? "認証に完了しました" : "認証に失敗しました"}
          </h1>
        </div>
      </div>
    </main>
  );
}
