import React from 'react'

export default function ClientPageHeader({ title, subtitle, rightContent }) {
  return (
    <section className="bg-gradient-hero pt-32 pb-10">
      <div className="container-max flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mt-2">{title}</h1>
          {subtitle && <p className="text-white/75 mt-2 max-w-2xl">{subtitle}</p>}
        </div>
        {rightContent && (
          <div className="shrink-0 self-start md:self-auto">
            {rightContent}
          </div>
        )}
      </div>
    </section>
  )
}
