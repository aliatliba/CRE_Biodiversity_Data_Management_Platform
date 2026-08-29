import { Reveal } from '@/components/common/Reveal'

const ROLES = [
  {
    tag: 'Administrator',
    title: 'Provisions the registry',
    points: [
      'Creates researcher accounts and issues their first-login credentials',
      'Defines survey sites — location, code, and description',
      'Manages account access and deactivation',
    ],
  },
  {
    tag: 'Researcher',
    title: 'Builds the record',
    points: [
      'Signs in with admin-issued credentials and sets a personal password',
      'Logs species observations against an assigned site',
      'Reviews duplicate flags and validation history before confirming an entry',
    ],
  },
]

export function RoleSplit() {
  return (
    <section id="roles" className="border-b border-mist-200/70 bg-paper-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8">
        <Reveal className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-canopy-700">Two roles, one registry</p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink-950 sm:text-[2.6rem]">
            Built around who's holding the clipboard.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {ROLES.map((role, i) => (
            <Reveal key={role.tag} delay={i * 0.12}>
              <div className="h-full rounded-2xl border border-mist-200/80 bg-paper-0 p-8 transition-transform duration-300 hover:-translate-y-0.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-lichen-400">
                  {role.tag}
                </span>
                <h3 className="mt-2 font-display text-2xl font-medium text-ink-950">{role.title}</h3>
                <ul className="mt-5 space-y-3">
                  {role.points.map((point) => (
                    <li key={point} className="flex gap-3 text-[14.5px] leading-relaxed text-ink-950/70">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-canopy-600" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
