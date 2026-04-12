"use client"

import { CheckIcon } from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

const steps = [
  { name: 'Crear cuenta', href: '#' },
  { name: 'Crear empresa', href: '/onboarding/seller' },
  { name: 'Crear producto', href: '/onboarding/products' },
  { name: 'Crear campaña', href: '/onboarding/campaings' },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function Example() {
  const pathname = usePathname()

  return (
    <nav aria-label="Progress" className="relative mt-10">
      <div className="absolute top-4 left-0 right-0 flex items-center justify-center">
        <div className="h-0.5 w-[90%] bg-orange-600" />
      </div>

      <ol role="list" className="flex items-start justify-center relative">
        {steps.map((step, stepIdx) => {
          let status: 'complete' | 'current' | 'upcoming' = 'upcoming'

          if (step.href === pathname) {
            status = 'current'
          } else if (
            steps.findIndex(s => s.href === pathname) !== -1 &&
            stepIdx < steps.findIndex(s => s.href === pathname)
          ) {
            status = 'complete'
          }

          return (
            <li
              key={step.name}
              className={classNames(
                stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : '',
                'flex flex-col items-center'
              )}
            >
              {status === 'complete' ? (
                <a
                  href={step.href}
                  className="flex size-8 items-center justify-center rounded-full bg-orange-600 hover:bg-orange-900 z-10"
                >
                  <CheckIcon aria-hidden="true" className="size-5 text-white" />
                </a>
              ) : status === 'current' ? (
                <a
                  href={step.href}
                  aria-current="step"
                  className="flex size-8 items-center justify-center rounded-full border-2 border-orange-600 bg-white z-10"
                >
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-orange-600" />
                </a>
              ) : (
                <a
                  href={step.href}
                  className="flex size-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white hover:border-gray-400 z-10"
                >
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-transparent group-hover:bg-gray-300" />
                </a>
              )}

              <span
                className={classNames(
                  'mt-2 text-sm font-medium text-center',
                  status === 'complete'
                    ? 'text-orange-600'
                    : status === 'current'
                    ? 'text-gray-900'
                    : 'text-gray-500'
                )}
              >
                {step.name}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
