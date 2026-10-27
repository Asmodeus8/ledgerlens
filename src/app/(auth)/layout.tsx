import { CircleCheck } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-[calc(100dvh-10rem)] items-center gap-12 lg:grid-cols-2">
      <div className="flex justify-center lg:justify-start lg:pl-8">{children}</div>
      <Showcase />
    </div>
  );
}

/** Decorative: a receipt turning into structured data. */
function Showcase() {
  return (
    <div aria-hidden className="relative hidden h-[30rem] overflow-hidden rounded-3xl border border-line bg-surface-2 lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent-soft),transparent_60%)]" />

      <div className="absolute top-14 left-12 w-56 rotate-[-4deg] rounded-t-lg bg-surface px-5 pt-5 pb-8 font-mono text-[11px] leading-5 text-muted shadow-lg [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),94%_100%,88%_calc(100%-8px),82%_100%,76%_calc(100%-8px),70%_100%,64%_calc(100%-8px),58%_100%,52%_calc(100%-8px),46%_100%,40%_calc(100%-8px),34%_100%,28%_calc(100%-8px),22%_100%,16%_calc(100%-8px),10%_100%,4%_calc(100%-8px),0_100%)]">
        <p className="font-semibold text-foreground">SHOPRITE LEKKI</p>
        <p>Receipt #A-20931</p>
        <p className="mb-2">14 Oct 2026</p>
        <p className="flex justify-between"><span>Bread ×2</span><span>2,400.00</span></p>
        <p className="flex justify-between"><span>Milk 1L</span><span>3,100.00</span></p>
        <p className="flex justify-between"><span>Rice 5kg</span><span>18,500.00</span></p>
        <p className="mt-2 flex justify-between"><span>VAT 7.5%</span><span>1,800.00</span></p>
        <p className="flex justify-between font-semibold text-foreground"><span>TOTAL</span><span>25,800.00</span></p>
      </div>

      <div className="absolute right-10 bottom-14 w-64 rounded-xl border border-line bg-surface p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Shoprite Lekki</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pr-2 pl-1.5 text-[11px] font-medium text-accent-soft-foreground">
            <CircleCheck className="h-3 w-3" />
            Extracted
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          <div>
            <dt className="text-subtle">Date</dt>
            <dd className="font-medium">14 Oct 2026</dd>
          </div>
          <div>
            <dt className="text-subtle">Category</dt>
            <dd className="font-medium">Food &amp; Dining</dd>
          </div>
          <div>
            <dt className="text-subtle">VAT</dt>
            <dd className="money font-medium">₦1,800.00</dd>
          </div>
          <div>
            <dt className="text-subtle">Total</dt>
            <dd className="money font-semibold">₦25,800.00</dd>
          </div>
        </dl>
      </div>

      <svg className="absolute top-[45%] left-[48%] h-16 w-24 text-line-strong" viewBox="0 0 96 64" fill="none">
        <path d="M4 8 C 40 8, 56 56, 88 56" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M82 50 L 89 56 L 82 62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
