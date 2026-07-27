"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/power-outage-requests");
    }
  }, [router, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        employeeId,
        password,
        remember: rememberMe,
      });

      if (result?.error) {
        setError("รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        router.replace("/power-outage-requests");
      }
    } catch {
      setError("เกิดข้อผิดพลาด โปรดลองอีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="ui-panel w-full max-w-md px-8 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-pea-100">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-pea-200 border-t-pea-700" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">
            กำลังตรวจสอบสิทธิ์
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            กรุณารอสักครู่ ระบบกำลังเตรียมพื้นที่ทำงานให้คุณ
          </p>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-frame)] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--app-border)] bg-white shadow-[var(--app-shadow-raised)]">
        <div className="grid lg:grid-cols-[1fr_0.92fr]">
          <section className="relative hidden min-h-[610px] overflow-hidden bg-pea-900 lg:block">
            <Image
              src="/transformer-login-hero.png"
              alt="อุปกรณ์ระบบจำหน่ายไฟฟ้า"
              fill
              className="object-cover opacity-65"
              priority
              sizes="(min-width: 1024px) 460px, 0px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-pea-900 via-pea-900/65 to-pea-900/20" />
            <div className="absolute inset-x-0 bottom-0 p-8 text-white">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                  <Image
                    src="/peatransformer-logo.png"
                    alt=""
                    width={34}
                    height={30}
                    className="h-8 w-auto"
                  />
                </span>
                <div>
                  <p className="font-bold">PeaTransformer</p>
                  <p className="text-sm text-pea-200">ระบบจัดการคำขอดับไฟ</p>
                </div>
              </div>
              <h1 className="max-w-sm text-2xl font-bold leading-snug">
                ติดตามงานอนุมัติและสถานะ OMS ในพื้นที่ทำงานเดียว
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-pea-100">
                สำหรับเจ้าหน้าที่การไฟฟ้าส่วนภูมิภาคที่รับผิดชอบงานดับไฟตามแผน
              </p>
            </div>
          </section>

          <section className="px-6 py-9 sm:px-10 lg:px-12 lg:py-12">
              <div className="mx-auto max-w-sm">
                <div className="mb-6 flex items-center gap-3 lg:hidden">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pea-100">
                    <Image
                      src="/peatransformer-logo.png"
                      alt="PeaTransformer"
                      width={28}
                      height={28}
                      className="h-8 w-auto object-contain"
                      priority
                    />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--app-text)]">PeaTransformer</p>
                    <p className="text-xs text-[var(--app-text-muted)]">ระบบจัดการคำขอดับไฟ</p>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--app-text)]">
                    เข้าสู่ระบบ
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--app-text-muted)]">
                    ใช้รหัสพนักงานและรหัสผ่านเพื่อเข้าสู่พื้นที่ปฏิบัติการ
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="employee-id"
                      className="text-[15px] font-semibold text-slate-800"
                    >
                      รหัสพนักงาน
                    </label>
                    <div className="group relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-pea-600" />
                      <input
                        id="employee-id"
                        name="employeeId"
                        type="text"
                        required
                        autoComplete="username"
                        className="ui-input block w-full py-3 pl-10 pr-4 text-base placeholder:text-slate-500"
                        placeholder="เช่น 540123"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        aria-label="รหัสพนักงาน"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="password"
                      className="text-[15px] font-semibold text-slate-800"
                    >
                      รหัสผ่าน
                    </label>
                    <div className="group relative">
                      <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-pea-600" />
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        className="ui-input block w-full py-3 pl-10 pr-4 text-base placeholder:text-slate-500"
                        placeholder="กรอกรหัสผ่าน"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-label="รหัสผ่าน"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="remember-me"
                      className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-[var(--app-text-body)]"
                    >
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-pea-700 focus:ring-pea-500"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="font-medium">จดจำฉัน</span>
                    </label>
                    <div className="inline-flex items-center gap-1.5 text-xs text-[var(--app-text-muted)]">
                      <LockKeyhole className="h-3 w-3" />
                      SSL Encrypted
                    </div>
                  </div>

                  {error && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-pea-700 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-pea-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>กำลังเข้าสู่ระบบ...</span>
                      </>
                    ) : (
                      <>
                        <span>เข้าสู่ระบบ</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>สำหรับพนักงาน กฟภ. เท่านั้น</span>
                </div>
              </div>
          </section>
        </div>
      </div>
    </div>
  );
}
