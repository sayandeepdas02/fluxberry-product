const BLUE = '#2d81ff';

const STAGES = ['Review', 'Interview', 'Offer'];

/** A quiet product preview with one pipeline and one candidate. */
export function HeroDashboard() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f7f9fd] font-sans text-[#0b0d17]">
      <aside className="absolute inset-y-0 left-0 w-[17%] border-r border-[#e6e9f0] bg-[#fbfcff]">
        <div className="absolute left-[18%] top-[9%] flex items-center gap-[12px]">
          <span className="flex size-[34px] items-center justify-center rounded-[10px] text-[22px] font-bold text-white" style={{ backgroundColor: BLUE }}>
            Z
          </span>
          <span className="text-[25px] font-bold tracking-[-0.04em]" style={{ color: BLUE }}>
            Zliptal
          </span>
        </div>
        <div className="absolute left-[24%] top-[27%] flex flex-col gap-[30px]" aria-hidden>
          <span className="size-[22px] rounded-[7px] bg-[#dce8ff]" />
          <span className="size-[22px] rounded-full bg-[#edf1f8]" />
          <span className="size-[22px] rounded-full bg-[#edf1f8]" />
        </div>
      </aside>

      <main className="absolute bottom-[13%] left-[20%] right-[5%] top-[9%] rounded-[24px] border border-[#e6e9f0] bg-white px-[4%] py-[3.5%] shadow-[0_20px_54px_-34px_rgba(15,35,82,0.24)]">
        <div className="flex items-center justify-between">
          <h2 className="text-[36px] font-semibold tracking-[-0.035em]">Hiring pipeline</h2>
          <span className="size-[12px] rounded-full bg-[#5c9bff]" aria-hidden />
        </div>

        <div className="relative mt-[72px] flex items-center justify-between">
          <span className="absolute left-[8%] right-[8%] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#e8edf5]" aria-hidden />
          {STAGES.map((stage, index) => (
            <div key={stage} className="relative flex items-center gap-[14px] bg-white pr-[14px]">
              <span
                className="size-[18px] rounded-full ring-[6px] ring-white"
                style={{ backgroundColor: index === 0 ? BLUE : '#d6deed' }}
                aria-hidden
              />
              <span className="text-[21px] font-medium text-[#4e5875]">{stage}</span>
            </div>
          ))}
        </div>

        <div className="mt-[68px] flex items-center gap-[20px] rounded-[18px] border border-[#edf0f5] bg-[#fcfdff] px-[24px] py-[20px]">
          <span className="flex size-[58px] shrink-0 items-center justify-center rounded-full bg-[#e8efff] text-[18px] font-semibold text-[#315fc7]">MC</span>
          <div className="min-w-0">
            <p className="truncate text-[22px] font-semibold">Maya Chen</p>
            <p className="mt-[5px] text-[18px] text-[#6b7390]">Product Designer</p>
          </div>
          <div className="ml-auto flex items-center gap-[14px] rounded-full bg-[#edf4ff] px-[17px] py-[10px] text-[19px] font-semibold text-[#285ec8]">
            <span className="size-[8px] rounded-full bg-[#4d8bff]" aria-hidden />
            94% match
          </div>
        </div>
      </main>
    </div>
  );
}
