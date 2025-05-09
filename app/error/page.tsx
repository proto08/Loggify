import { ShieldX } from "lucide-react";

export default function Error() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="p-9 rounded-3xl md:w-1/2 max-w-md border border-white/[0.08] bg-white/[0.02]  hover:border-white/[0.12] transition-colors duration-300">
        <div className="mx-auto">
          <ShieldX size={50} className="text-red-500 mx-auto mb-4"/>
          <h1 className="text-2xl font-bold mb-4 text-center">Failed Verification</h1>
          <h1 className="text-xl font-bold mb-4 text-center">認証に失敗しました</h1>
        </div>
      </div>
    </div>
  );
}
