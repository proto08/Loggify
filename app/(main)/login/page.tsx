import { LoginForm } from "@/components/login-form"


export default function LoginPage() {
  return (
    <div className="bg-black flex min-h-screen flex-col items-center justify-center gap-6 mt-10 p-2 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <LoginForm />
      </div>
    </div>
  )
}
