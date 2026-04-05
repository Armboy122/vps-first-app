"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  GaugeCircle,
  KeyRound,
  LockKeyhole,
  Orbit,
  ScanSearch,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const highlights = [
  {
    title: "ควบคุมงานคงค้างให้ไม่หลุดกำหนด",
    description: "เห็นงานที่อนุมัติแล้วแต่ยังไม่ลง OMS ได้เร็วพอที่จะตัดสินใจและเร่งติดตาม",
    icon: GaugeCircle,
  },
  {
    title: "มองเครือข่ายไฟฟ้าแบบเป็นระบบ",
    description: "ตรวจสอบหม้อแปลง พื้นที่ และลำดับความเร่งด่วนจากมุมมองที่ออกแบบมาสำหรับงานภาคสนาม",
    icon: Orbit,
  },
  {
    title: "ตัดสินใจไวขึ้นในช่วงเวลาสำคัญ",
    description: "ข้อมูลที่ถูกจัดระเบียบดีช่วยลดการสลับจอและลดความเสี่ยงจากการมองข้ามสถานะสำคัญ",
    icon: ScanSearch,
  },
];

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
        <div className="app-surface w-full max-w-md rounded-[28px] px-8 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-pea-200/80 bg-white/80 shadow-sm">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-pea-200 border-t-pea-700" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">
            กำลังตรวจสอบสิทธิ์
          </h2>
          <p className="mt-2 text-sm text-slate-500">
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
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/70 shadow-[0_30px_90px_rgba(80,30,150,0.10)] backdrop-blur-2xl">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left — branding & highlights */}
            <section className="relative hidden overflow-hidden bg-gradient-to-br from-pea-700 via-pea-800 to-pea-900 px-10 py-12 lg:block">
              {/* Decorative circles */}
              <div aria-hidden="true" className="absolute inset-0">
                <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-pea-600/20" />
                <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-pea-500/10" />
                <div className="absolute right-12 top-1/2 h-32 w-32 rounded-full border border-white/10" />
              </div>

              <div className="relative flex h-full flex-col justify-between">
                {/* Logo & name */}
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                      <Image
                        src="/peatransformer-logo.png"
                        alt="PeaTransformer"
                        width={36}
                        height={36}
                        className="h-8 w-8 object-contain"
                        priority
                      />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">
                        PeaTransformer
                      </p>
                      <p className="text-xs font-medium tracking-wider text-pea-200/80">
                        Operations Platform
                      </p>
                    </div>
                  </div>

                  {/* Hero illustration */}
                  <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <Image
                      src="/transformer-login-hero.png"
                      alt="Transformer illustration"
                      width={400}
                      height={300}
                      className="h-auto w-full rounded-xl"
                    />
                  </div>
                </div>

                {/* Highlights */}
                <div className="mt-8 space-y-4">
                  {highlights.map((h) => (
                    <div key={h.title} className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                        <h.icon className="h-4 w-4 text-pea-200" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {h.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-pea-200/70">
                          {h.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Right — login form */}
            <section className="bg-white/90 px-6 py-10 sm:px-10 lg:px-12 lg:py-12">
              <div className="mx-auto max-w-sm">
                {/* Mobile logo */}
                <div className="mb-6 flex items-center gap-3 lg:hidden">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pea-700">
                    <Image
                      src="/peatransformer-logo.png"
                      alt="PeaTransformer"
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                      priority
                    />
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    PeaTransformer
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    เข้าสู่ระบบ
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    ใช้รหัสพนักงานและรหัสผ่านเพื่อเข้าสู่พื้นที่ปฏิบัติการ
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="employee-id"
                      className="text-sm font-semibold text-slate-700"
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
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-10 pr-4 text-[15px] text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-pea-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pea-100"
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
                      className="text-sm font-semibold text-slate-700"
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
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-10 pr-4 text-[15px] text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-pea-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pea-100"
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
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600"
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
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <LockKeyhole className="h-3 w-3" />
                      SSL Encrypted
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pea-700 px-4 py-3 text-sm font-semibold text-white shadow-pea transition-all hover:bg-pea-800 hover:shadow-pea-lg focus:outline-none focus:ring-2 focus:ring-pea-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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

                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>สำหรับพนักงาน กฟภ. เท่านั้น</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
