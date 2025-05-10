import { ShieldCheck } from "lucide-react";

export default function Success() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black">
      <div className="p-9 rounded-3xl border w-1/2 max-w-md border-white/[0.08] bg-white/[0.02]  hover:border-white/[0.12] transition-colors duration-300">
        <div className="mx-auto">
          <ShieldCheck size={50} className="text-green-500 mx-auto mb-4"/>
          <h1 className="text-2xl font-bold mb-4 text-center">Completed Verification</h1>
          <h1 className="text-xl font-bold mb-4 text-center">認証に完了しました</h1>
        </div>
      </div>
    </main>
  );
}
